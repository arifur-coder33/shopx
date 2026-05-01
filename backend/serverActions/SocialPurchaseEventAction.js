"use server";
import prisma from "@/lib/prisma";
import { EVENTS } from "@/lib/SocialEventTracking/events";
import { fireFacebookCAPI } from "../utils/SocialServerEvent/fireFacebookCAPI";
import { fireGoogleServer } from "../utils/SocialServerEvent/fireGoogleServer";
import { fireTikTokServer } from "../utils/SocialServerEvent/fireTikTokServer";

export async function firePurchaseServer(orderId) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },

      select: {
        id: true,
        orderPrice: true,
        email: true,
        phoneNumber: true,
        createdAt: true,
        fbp: true,
        fbc: true,
        gclid: true,
        ttclid: true,

        ipAddress: true,
        userAgent: true,
        userId: true,

        orderItems: {
          select: {
            productId: true,
            quantity: true,
            price: true,
            sku: true,
            productName: true,
            product: {
              select: {
                category: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!order) return false;

    const eventId = `purchase_${order.id}`;

    const payload = {
      event: EVENTS.PURCHASE,
      eventId,
      eventTime: Math.floor(new Date(order.createdAt).getTime() / 1000),
      value: order.orderPrice,
      currency: "BDT",
      src: "/payment/success",
      items: order.orderItems.map((item) => ({
        id: item.sku,
        quantity: item.quantity,
        price: item.price,
        name: item.productName,
        category: item?.product?.category?.name,
      })),

      user: {
        email: order.email,
        phone: order.phoneNumber,
        userId: order.userId,

        fbp: order.fbp,
        fbc: order.fbc,
        gclid: order.gclid,
        ttclid: order.ttclid,

        ip: order.ipAddress,
        agent: order.userAgent,
      },
    };

    await Promise.all([
      fireFacebookCAPI(payload),
      fireGoogleServer(payload),
      fireTikTokServer(payload),
    ]).catch(console.error);

    return true;
  } catch (err) {
    console.error("Purchase tracking error:", err);
    return false;
  }
}
