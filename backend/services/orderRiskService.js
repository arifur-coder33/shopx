import prisma from "@/lib/prisma";
import { assessOrderRisk } from "@/backend/utils/orderRisk";

const WINDOW_MS = 10 * 60 * 1000;

export async function updateRecentOrderRiskScores({ orderId, history = [] }) {
  try {
    const current = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        phoneNumber: true,
        ipAddress: true,
        userAgent: true,
        paymentMethod: true,
        orderPrice: true,
        deliveryCharge: true,
        deliveryAddress: true,
        city: true,
        thana: true,
        status: true,
        createdAt: true,
      },
    });
    if (!current) return;

    const now = current.createdAt.getTime();
    const sameDevice = (order) =>
      Boolean(current.ipAddress && current.userAgent) &&
      order.ipAddress === current.ipAddress &&
      order.userAgent === current.userAgent;
    const burst = [...history, current].filter((order) =>
      Math.abs(now - new Date(order.createdAt).getTime()) <= WINDOW_MS &&
      (order.phoneNumber === current.phoneNumber || sameDevice(order)),
    );
    const samePhoneCount = burst.filter((order) => order.phoneNumber === current.phoneNumber).length;
    const sameDeviceCount = burst.filter(sameDevice).length;
    const phoneBurst = samePhoneCount >= 2;
    const deviceBurst = sameDeviceCount >= 3;
    if (!phoneBurst && !deviceBurst) return;

    const olderOrders = burst.filter((order) => order.id !== current.id && order.paymentMethod === "COD");
    await Promise.all(olderOrders.map(async (order) => {
      let metadataFactors = (Array.isArray(order.fraudRiskFactors) ? order.fraudRiskFactors : [])
        .filter((factor) => ["ORDER_ORIGIN", "STEADFAST_HISTORY", "STEADFAST_TRACKING"].includes(factor?.code));
      if (metadataFactors.length < 3) {
        const latest = await prisma.order.findUnique({ where: { id: order.id }, select: { fraudRiskFactors: true } });
        const latestMetadata = (Array.isArray(latest?.fraudRiskFactors) ? latest.fraudRiskFactors : [])
          .filter((factor) => ["ORDER_ORIGIN", "STEADFAST_HISTORY", "STEADFAST_TRACKING"].includes(factor?.code));
        const metadataByCode = new Map([...metadataFactors, ...latestMetadata].map((factor) => [factor.code, factor]));
        metadataFactors = [...metadataByCode.values()];
      }
      const assessment = assessOrderRisk({
        paymentMethod: order.paymentMethod,
        orderAmount: Number(order.orderPrice || 0) + Number(order.deliveryCharge || 0),
        phoneNumber: order.phoneNumber,
        ipAddress: order.ipAddress,
        userAgent: order.userAgent,
        deliveryAddress: order.deliveryAddress,
        city: order.city,
        thana: order.thana,
        history: [...history.filter((item) => item.id !== order.id), current],
        now,
        orderCreatedAt: order.createdAt,
      });
      await prisma.order.update({
        where: { id: order.id },
        data: {
          fraudRiskScore: assessment.score,
          fraudRiskLevel: assessment.level,
          fraudRiskFactors: [
            ...assessment.factors,
            ...metadataFactors,
          ],
        },
      });
    }));
  } catch (error) {
    console.error("Could not refresh recent order risk scores:", error);
  }
}
