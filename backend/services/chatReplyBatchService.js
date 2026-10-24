import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import prisma from "@/lib/prisma";

const QUIET_MS = 4000;

// Database leases serialize webhook workers across server instances.
export async function runChatReplyBatch(conversationId, reply) {
  await delay(QUIET_MS);
  const token = randomUUID();
  const claimed = await prisma.chatConversation.updateMany({
    where: { id: conversationId, OR: [{ aiReplyLeaseUntil: null }, { aiReplyLeaseUntil: { lt: new Date() } }] },
    data: { aiReplyLeaseToken: token, aiReplyLeaseUntil: new Date(Date.now() + 120000) },
  });
  if (!claimed.count) return;
  try {
    while (true) {
      const latest = await prisma.chatMessage.findFirst({
        where: { conversationId, direction: "INBOUND", authorType: "CUSTOMER" },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });
      if (!latest) return;
      const quietRemaining = QUIET_MS - (Date.now() - latest.createdAt.getTime());
      if (quietRemaining > 0) { await delay(quietRemaining); continue; }
      const existing = await prisma.chatMessage.findUnique({ where: { aiReplyForMessageId: latest.id }, select: { id: true } });
      if (existing) return;
      await reply(latest.id);
      const newer = await prisma.chatMessage.findFirst({
        where: { conversationId, direction: "INBOUND", authorType: "CUSTOMER", createdAt: { gt: latest.createdAt } },
        select: { id: true },
      });
      if (!newer) return;
      await prisma.chatConversation.updateMany({ where: { id: conversationId, aiReplyLeaseToken: token }, data: { aiReplyLeaseUntil: new Date(Date.now() + 120000) } });
    }
  } finally {
    await prisma.chatConversation.updateMany({ where: { id: conversationId, aiReplyLeaseToken: token }, data: { aiReplyLeaseToken: null, aiReplyLeaseUntil: null } });
  }
}

export async function mergedInboundMessage(inbound) {
  const previousReply = await prisma.chatMessage.findFirst({
    where: { conversationId: inbound.conversationId, direction: "OUTBOUND", authorType: { in: ["AI", "AGENT"] }, deliveryStatus: { in: ["SENT", "DELIVERED", "READ"] },
      createdAt: { lt: inbound.createdAt } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { createdAt: true, aiReplyForMessageId: true },
  });
  const previousSource = previousReply?.aiReplyForMessageId ? await prisma.chatMessage.findUnique({ where: { id: previousReply.aiReplyForMessageId }, select: { createdAt: true } }) : null;
  const boundary = previousSource?.createdAt || previousReply?.createdAt || new Date(inbound.createdAt.getTime() - 30 * 60000);
  const messages = await prisma.chatMessage.findMany({
    where: { conversationId: inbound.conversationId, direction: "INBOUND", authorType: "CUSTOMER", createdAt: { gt: boundary, lte: inbound.createdAt } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  if (messages.length < 2) return inbound;
  const hasImage = (message) => message.metadata?.image || message.mediaId || message.metadata?.attachments?.some((item) => item.type === "image");
  const actionIndex = messages.findLastIndex((message) => /^(?:select|details|order|checkout):/u.test(String(message.metadata?.quickReplyPayload || "")));
  const imageIndex = messages.findLastIndex(hasImage);
  const actionMessage = actionIndex >= imageIndex && actionIndex >= 0 ? messages[actionIndex] : null;
  // A button selects a new intent. Do not attach an earlier search photo to its details request.
  const activeMessages = actionMessage ? messages.slice(actionIndex) : messages;
  const imageMessage = activeMessages.findLast(hasImage);
  return {
    ...inbound,
    content: activeMessages.map((message) => message.content).filter(Boolean).join("\n"),
    mediaId: imageMessage?.mediaId || inbound.mediaId,
    metadata: { ...(imageMessage?.metadata || {}), ...(actionMessage?.metadata || {}), ...(inbound.metadata || {}),
      ...(actionMessage && { quickReplyPayload: actionMessage.metadata.quickReplyPayload, productId: actionMessage.metadata.productId || String(actionMessage.metadata.quickReplyPayload).match(/^(?:select|details|order):(.+)$/u)?.[1] }),
      ...(imageMessage?.metadata?.image && { image: imageMessage.metadata.image }),
      ...(imageMessage?.metadata?.attachments && { attachments: imageMessage.metadata.attachments }),
      batchedMessageIds: messages.map((message) => message.id),
    },
  };
}
