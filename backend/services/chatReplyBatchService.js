import prisma from "@/lib/prisma";
import { runReplyBatch, newerInboundWhere, mergeInboundBatch } from "./chatReplyBatchCore.mjs";

export { newerInboundWhere };
export const runChatReplyBatch = (conversationId, reply) => runReplyBatch(prisma, conversationId, reply);
export async function mergedInboundMessage(inbound) {
  const previousReply = await prisma.chatMessage.findFirst({
    where: { conversationId: inbound.conversationId, direction: "OUTBOUND", authorType: { in: ["AI", "AGENT"] }, deliveryStatus: { in: ["SENT", "DELIVERED", "READ"] },
      createdAt: { lt: inbound.createdAt } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { createdAt: true, aiReplyForMessageId: true },
  });
  const previousSource = previousReply?.aiReplyForMessageId ? await prisma.chatMessage.findUnique({ where: { id: previousReply.aiReplyForMessageId }, select: { id: true, createdAt: true } }) : null;
  const boundary = previousSource?.createdAt || previousReply?.createdAt || new Date(inbound.createdAt.getTime() - 30 * 60000);
  const messages = await prisma.chatMessage.findMany({
    where: { conversationId: inbound.conversationId, direction: "INBOUND", authorType: "CUSTOMER", AND: [
      previousSource ? newerInboundWhere({ ...previousSource, conversationId: inbound.conversationId }) : { createdAt: { gt: boundary } },
      { OR: [{ createdAt: { lt: inbound.createdAt } }, { createdAt: inbound.createdAt, id: { lte: inbound.id } }] },
    ] },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  return mergeInboundBatch(messages, inbound);
}
