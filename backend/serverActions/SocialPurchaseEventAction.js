"use server";
import prisma from "@/lib/prisma";
import { EVENTS } from "@/lib/SocialEventTracking/events";
import { fireFacebookCAPI } from "../utils/SocialServerEvent/fireFacebookCAPI";
import { fireGoogleServer } from "../utils/SocialServerEvent/fireGoogleServer";
import { fireTikTokServer } from "../utils/SocialServerEvent/fireTikTokServer";
import { getServerSocialTrackingSettings } from "@/backend/services/socialTrackingService";

export async function firePurchaseServer({ orderNo, orderId, actionSource = "website" }) {
  try {
    const order = await prisma.order.findUnique({
      where: orderNo ? { orderNo } : { id: orderId },

      select: {
        id: true,
        orderPrice: true,
        adminDiscount: true,
        deliveryCharge: true,
        email: true,
        phoneNumber: true,
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
      value: Math.max(0, Number(order.orderPrice || 0) - Number(order.adminDiscount || 0)),
      shipping: Number(order.deliveryCharge || 0),
      transactionId: order.orderNo,
      currency: "BDT",
      actionSource,
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

    const trackingSettings = await getServerSocialTrackingSettings();
    await Promise.all([
      fireFacebookCAPI(payload, trackingSettings),
      fireGoogleServer(payload, trackingSettings),
      fireTikTokServer(payload, trackingSettings),
    ]).catch(console.error);

    return true;
  } catch (err) {
    console.error("Purchase tracking error:", err);
    return false;
  }
}
