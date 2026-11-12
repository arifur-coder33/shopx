import "server-only";
import prisma from "@/lib/prisma";
import { getSiteUrl } from "@/lib/siteUrl";
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
        orderNo: true,
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
      src: await getSiteUrl(),
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
    const results = await Promise.allSettled([
      fireFacebookCAPI(payload, trackingSettings, { useSavedTestCode: true }),
      fireGoogleServer(payload, trackingSettings),
      fireTikTokServer(payload, trackingSettings),
    ]);
    const providers = ["Meta", "GA4", "TikTok"];
    results.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value?.success) {
        if (index === 0) console.info("Meta accepted Purchase", {
          eventId,
          testMode: Boolean(trackingSettings.facebookTestEventCode),
          eventsReceived: result.value.data?.events_received,
        });
        return;
      }
      const outcome = result.status === "fulfilled" ? result.value : null;
      console.warn("Purchase tracking not submitted", {
        eventId,
        provider: providers[index],
        status: outcome?.skipped ? "skipped" : "failed",
        code: outcome?.data?.error?.code,
        subcode: outcome?.data?.error?.error_subcode,
      });
    });
    return results.some((result) => result.status === "fulfilled" && result.value?.success);
  } catch (err) {
    console.error("Purchase tracking error:", err);
    return false;
  }
}
