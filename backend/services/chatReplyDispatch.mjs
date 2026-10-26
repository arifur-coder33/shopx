const checkoutButton = (payload) => /^(?:select|order):[a-zA-Z0-9_-]{5,80}$/u.test(String(payload || ""))
  || /^checkout:[a-f0-9-]{36}:[a-f0-9-]{36}:.{1,100}$/u.test(String(payload || ""));

// Customer actions must not wait for, or be dropped by, an unrelated AI batch lease.
// The reply handler still claims the inbound ID and checks for newer input before sending.
export async function dispatchChatReply({ conversationId, inboundMessageId, db, reply, batch }) {
  if (!inboundMessageId) return;
  const inbound = await db.chatMessage.findUnique({
    where: { id: inboundMessageId },
    select: { id: true, conversationId: true, direction: true, authorType: true, metadata: true },
  });
  if (!inbound || inbound.conversationId !== conversationId || inbound.direction !== "INBOUND" || inbound.authorType !== "CUSTOMER") return;

  if (checkoutButton(inbound.metadata?.quickReplyPayload)) {
    return reply(inbound.id);
  }

  const latestFlowMessage = await db.chatMessage.findFirst({
    where: {
      conversationId,
      direction: "OUTBOUND",
      deliveryStatus: { not: "FAILED" },
      metadata: { path: ["chatOrderFlow", "step"], string_starts_with: "" },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { metadata: true },
  });
  const flow = latestFlowMessage?.metadata?.chatOrderFlow;
  if (flow && flow.step !== "done") return reply(inbound.id);

  return batch(conversationId, reply);
}
