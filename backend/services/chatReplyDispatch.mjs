// Checkout input and button actions share the same quiet window as normal chat.
export async function dispatchChatReply({ conversationId, inboundMessageId, db, reply, batch }) {
  if (!inboundMessageId) return;
  const inbound = await db.chatMessage.findUnique({
    where: { id: inboundMessageId },
    select: { id: true, conversationId: true, direction: true, authorType: true, metadata: true },
  });
  if (!inbound || inbound.conversationId !== conversationId || inbound.direction !== "INBOUND" || inbound.authorType !== "CUSTOMER") return;

  return batch(conversationId, reply);
}
