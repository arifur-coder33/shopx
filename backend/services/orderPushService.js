import "server-only";
import webpush from "web-push";
import prisma from "@/lib/prisma";


function hasVapidConfig() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}

export async function getOrderPushPublicKey() {
  return hasVapidConfig() ? process.env.VAPID_PUBLIC_KEY : null;
}

export async function saveOrderPushSubscription(userId, subscription) {
  const endpoint = String(subscription?.endpoint || "");
  const p256dh = String(subscription?.keys?.p256dh || "");
  const auth = String(subscription?.keys?.auth || "");
  if (!userId || !endpoint.startsWith("https://") || !p256dh || !auth) {
    throw new Error("Invalid push subscription.");
  }
  const now = new Date();
  await prisma.orderPushSubscription.upsert({
    where: { endpoint },
    update: { userId, subscription, updatedAt: now },
    create: { userId, endpoint, subscription, createdAt: now, updatedAt: now },
  });
}

export async function removeOrderPushSubscription(userId, endpoint) {
  if (!userId || !endpoint) return;
  await prisma.orderPushSubscription.deleteMany({ where: { userId, endpoint } });
}

export async function sendOrderPushNotification(order) {
  if (!hasVapidConfig()) {
    console.warn("[order-push] VAPID config is missing on the server.");
    return;
  }
  const subscriptions = await prisma.orderPushSubscription.findMany({
    select: { subscription: true },
  });
  if (!subscriptions.length) {
    console.warn("[order-push] No browser subscriptions are saved.");
    return;
  }

  webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  const payload = JSON.stringify({
    title: `নতুন অর্ডার #${order.orderNo}`,
    body: "নতুন অর্ডার এসেছে। বিস্তারিত দেখতে ট্যাপ করুন।",
    orderId: order.id,
    url: `/admin/orders2/${order.id}`,
    tag: `order-${order.id}`,
  });
  const results = await Promise.allSettled(subscriptions.map(async ({ subscription }) => {
    if (!subscription?.endpoint) return;
    try {
      await webpush.sendNotification(subscription, payload, { TTL: 60 * 60 });
    } catch (error) {
      if (error?.statusCode === 404 || error?.statusCode === 410) {
        await prisma.orderPushSubscription.deleteMany({ where: { endpoint: subscription.endpoint } });
      }
      throw error;
    }
  }));
  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length) {
    console.error("[order-push] Delivery failed for subscriptions.", failures.map(({ reason }) => ({ statusCode: reason?.statusCode || "unknown" })));
  }
}

export async function sendOrderPushTestNotification(userId) {
  if (!hasVapidConfig()) throw new Error("VAPID config is missing on the server.");
  const subscriptions = await prisma.orderPushSubscription.findMany({
    where: { userId },
    select: { endpoint: true, subscription: true },
  });
  if (!subscriptions.length) throw new Error("এই admin device-এ কোনো push subscription পাওয়া যায়নি। আবার নোটিফিকেশন চালু করুন।");

  webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  const payload = JSON.stringify({
    title: "টেস্ট push notification",
    body: "এই browser-এ order push ঠিকভাবে কাজ করছে।",
    url: "/admin/orders2",
    tag: `order-push-test-${Date.now()}`,
  });
  const results = await Promise.allSettled(subscriptions.map(({ endpoint, subscription }) =>
    webpush.sendNotification(subscription, payload, { TTL: 60 * 60 }).catch(async (error) => {
      if (error?.statusCode === 404 || error?.statusCode === 410) {
        await prisma.orderPushSubscription.deleteMany({ where: { endpoint } });
      }
      throw error;
    }),
  ));
  const sent = results.filter((result) => result.status === "fulfilled").length;
  if (!sent) {
    const statusCode = results.find((result) => result.status === "rejected")?.reason?.statusCode;
    throw new Error(statusCode ? `Push provider delivery failed (HTTP ${statusCode}).` : "Push provider delivery failed.");
  }
  return { sent, failed: results.length - sent };
}