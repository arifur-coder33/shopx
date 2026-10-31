import "server-only";
import webpush from "web-push";
import prisma from "@/lib/prisma";

function hasVapidConfig() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}

export async function sendChatPushNotification({ conversationId, channel, customerName, customerPhone, content, metadata }) {
  if (!hasVapidConfig()) return;
  try {
    const chatViewers = await prisma.user.findMany({
      where: { OR: [
        { role: { name: "SUPER_ADMIN" } },
        { role: { permissions: { some: { allowed: true, resource: { key: "chatInbox" }, action: { key: "view" } } } } },
      ] },
      select: { id: true },
    });
    if (!chatViewers.length) return;
    const subscriptions = await prisma.orderPushSubscription.findMany({
      where: { userId: { in: chatViewers.map((user) => user.id) } },
      select: { endpoint: true, subscription: true },
    });
    if (!subscriptions.length) return;

    webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    const body = String(content || (metadata?.type === "ORDER_TIMELINE" ? "Customer একটি order পাঠিয়েছেন।" : "নতুন customer message এসেছে।")).slice(0, 180);
    const payload = JSON.stringify({
      type: "chat",
      title: customerName || customerPhone || `${channel || "Chat"} · নতুন message`,
      body,
      conversationId,
      url: `/admin/chat?conversation=${encodeURIComponent(conversationId)}`,
      tag: `chat-${conversationId}`,
    });
    const results = await Promise.allSettled(subscriptions.map(async ({ endpoint, subscription }) => {
      try { await webpush.sendNotification(subscription, payload, { TTL: 60 * 60 * 24 }); }
      catch (error) {
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await prisma.orderPushSubscription.deleteMany({ where: { endpoint } });
        }
        throw error;
      }
    }));
    const failures = results.filter((result) => result.status === "rejected");
    if (failures.length) console.error("[chat-push] Delivery failed.", failures.map(({ reason }) => ({ statusCode: reason?.statusCode || "unknown" })));
  } catch (error) {
    console.error("[chat-push] Notification could not be sent.", error?.message || "unknown error");
  }
}

export async function sendChatPushTestNotification(userId, endpoint) {
  if (!hasVapidConfig()) throw new Error("Server-এ VAPID push key configure করা নেই।");
  if (!userId || !endpoint) throw new Error("এই browser-এর push subscription পাওয়া যায়নি।");
  const saved = await prisma.orderPushSubscription.findFirst({ where: { userId, endpoint }, select: { subscription: true } });
  if (!saved) throw new Error("এই browser-এর subscription server-এ পাওয়া যায়নি। Push আবার চালু করুন।");
  webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  const payload = JSON.stringify({
    type: "chat-test",
    title: "Admin chat push test",
    body: "এই device-এ admin chat push ঠিকভাবে কাজ করছে।",
    url: "/admin/chat",
    tag: `chat-push-test-${Date.now()}`,
  });
  try { await webpush.sendNotification(saved.subscription, payload, { TTL: 60 * 60 }); }
  catch (error) {
    if (error?.statusCode === 404 || error?.statusCode === 410) await prisma.orderPushSubscription.deleteMany({ where: { userId, endpoint } });
    throw new Error(error?.statusCode ? `Push provider delivery failed (HTTP ${error.statusCode}).` : "Push provider delivery failed.");
  }
  return { sent: true };
}
