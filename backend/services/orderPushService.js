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
  if (!hasVapidConfig()) return;
  const subscriptions = await prisma.orderPushSubscription.findMany({
    select: { subscription: true },
  });
  if (!subscriptions.length) return;

  webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  const payload = JSON.stringify({
    title: `নতুন অর্ডার #${order.orderNo}`,
    body: "নতুন অর্ডার এসেছে। বিস্তারিত দেখতে ট্যাপ করুন।",
    orderId: order.id,
    url: `/admin/orders2/${order.id}`,
    tag: `order-${order.id}`,
  });
  await Promise.allSettled(subscriptions.map(async ({ subscription }) => {
    if (!subscription?.endpoint) return;
    try {
      await webpush.sendNotification(subscription, payload, { TTL: 60 * 60 });
    } catch (error) {
      if (error?.statusCode === 404 || error?.statusCode === 410) {
        await prisma.orderPushSubscription.deleteMany({ where: { endpoint: subscription.endpoint } });
      }
    }
  }));
}
