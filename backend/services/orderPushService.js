import "server-only";
import webpush from "web-push";
import { getNativeMongoDatabase } from "@/lib/nativeMongo";

const COLLECTION = "OrderPushSubscription";

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
  const db = await getNativeMongoDatabase();
  const collection = db.collection(COLLECTION);
  await collection.createIndex({ endpoint: 1 }, { unique: true });
  await collection.updateOne(
    { endpoint },
    { $set: { userId, subscription: { endpoint, keys: { p256dh, auth } }, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true },
  );
}

export async function removeOrderPushSubscription(userId, endpoint) {
  if (!userId || !endpoint) return;
  const db = await getNativeMongoDatabase();
  await db.collection(COLLECTION).deleteOne({ userId, endpoint });
}

export async function sendOrderPushNotification(order) {
  if (!hasVapidConfig()) return;
  const db = await getNativeMongoDatabase();
  const subscriptions = await db.collection(COLLECTION).find({}, { projection: { subscription: 1 } }).toArray();
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
        await db.collection(COLLECTION).deleteOne({ "subscription.endpoint": subscription.endpoint });
      }
    }
  }));
}
