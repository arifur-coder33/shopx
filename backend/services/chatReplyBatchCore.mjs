import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

export const CHAT_REPLY_QUIET_MS = 4000;
const LEASE_MS = 45000;

export function mergeInboundBatch(messages, inbound) {
  if (messages.length < 2) return inbound;
  const hasImage = (message) => message.metadata?.image || message.mediaId || message.metadata?.attachments?.some((item) => item.type === "image");
  const actionIndex = messages.findLastIndex((message) => /^(?:select|details|order|checkout):/u.test(String(message.metadata?.quickReplyPayload || "")));
  const imageIndex = messages.findLastIndex(hasImage);
  const actionMessage = actionIndex >= imageIndex && actionIndex >= 0 ? messages[actionIndex] : null;
  const activeMessages = actionMessage ? messages.slice(actionIndex) : messages;
  const imageMessage = activeMessages.findLast(hasImage);
  return {
    ...inbound,
    content: activeMessages.map((message) => message.content).filter(Boolean).join("\n"),
    mediaId: imageMessage?.mediaId || inbound.mediaId,
    metadata: { ...(imageMessage?.metadata || {}), ...(actionMessage?.metadata || {}), ...(inbound.metadata || {}),
      // Later written input can correct/cancel an earlier button action.
      ...(actionMessage && { quickReplyPayload: actionMessage.id === inbound.id ? actionMessage.metadata.quickReplyPayload : null,
        action: actionMessage.metadata.action || String(actionMessage.metadata.quickReplyPayload).split(":")[0],
        productId: actionMessage.metadata.productId || String(actionMessage.metadata.quickReplyPayload).match(/^(?:select|details|order):(.+)$/u)?.[1] }),
      ...(imageMessage?.metadata?.image && { image: imageMessage.metadata.image }),
      ...(imageMessage?.metadata?.attachments && { attachments: imageMessage.metadata.attachments }),
      batchedMessageIds: messages.map((message) => message.id),
      batchedLatestText: inbound.content,
    },
  };
}

export function newerInboundWhere(inbound) {
  return {
    conversationId: inbound.conversationId, direction: "INBOUND", authorType: "CUSTOMER",
    OR: [{ createdAt: { gt: inbound.createdAt } }, { createdAt: inbound.createdAt, id: { gt: inbound.id } }],
  };
}

// Contenders wait for the current worker instead of losing their wake-up.
export async function runReplyBatch(db, conversationId, reply, { sleep = delay, now = Date.now } = {}) {
  await sleep(CHAT_REPLY_QUIET_MS);
  const token = randomUUID();
  while (true) {
    const claimed = await db.chatConversation.updateMany({
      where: { id: conversationId, OR: [{ aiReplyLeaseUntil: null }, { aiReplyLeaseUntil: { lt: new Date(now()) } }] },
      data: { aiReplyLeaseToken: token, aiReplyLeaseUntil: new Date(now() + LEASE_MS) },
    });
    if (claimed.count) break;
    const latest = await db.chatMessage.findFirst({
      where: { conversationId, direction: "INBOUND", authorType: "CUSTOMER" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true },
    });
    if (!latest) return;
    const answered = await db.chatMessage.findUnique({ where: { aiReplyForMessageId: latest.id }, select: { deliveryStatus: true } });
    if (answered && ["SENT", "DELIVERED", "READ"].includes(answered.deliveryStatus)) return;
    await sleep(1000);
  }
  const renew = () => db.chatConversation.updateMany({
    where: { id: conversationId, aiReplyLeaseToken: token },
    data: { aiReplyLeaseUntil: new Date(now() + LEASE_MS) },
  });
  let heartbeatError = null;
  const heartbeat = setInterval(() => { renew().catch((error) => { heartbeatError = error; }); }, 10000);
  heartbeat.unref?.();
  try {
    while (true) {
      if (heartbeatError) throw heartbeatError;
      const latest = await db.chatMessage.findFirst({
        where: { conversationId, direction: "INBOUND", authorType: "CUSTOMER" },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });
      if (!latest) return;
      const remaining = CHAT_REPLY_QUIET_MS - (now() - latest.createdAt.getTime());
      if (remaining > 0) { await sleep(remaining); continue; }
      const existing = await db.chatMessage.findUnique({
        where: { aiReplyForMessageId: latest.id }, select: { id: true, deliveryStatus: true, metadata: true },
      });
      if (existing) {
        if (existing.deliveryStatus !== "SENDING" && existing.metadata?.aiErrorCode !== "batch_superseded") return;
        // With this lease exclusively ours, a SENDING row is an interrupted
        // worker's placeholder. Release its source ID so it can be retried.
        await db.chatMessage.update({ where: { id: existing.id }, data: {
          aiReplyForMessageId: null, deliveryStatus: "FAILED",
          metadata: { ...(existing.metadata || {}), internalOnly: true, aiErrorCode: "batch_superseded" },
        } });
      }
      if (!(await renew()).count) return;
      await reply(latest.id, token);
      const newer = await db.chatMessage.findFirst({ where: newerInboundWhere(latest), select: { id: true } });
      if (!newer) return;
    }
  } finally {
    clearInterval(heartbeat);
    await db.chatConversation.updateMany({ where: { id: conversationId, aiReplyLeaseToken: token }, data: { aiReplyLeaseToken: null, aiReplyLeaseUntil: null } });
  }
}
