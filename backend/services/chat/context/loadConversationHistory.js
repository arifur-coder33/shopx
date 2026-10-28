const MESSAGE_SELECT = {
  id: true,
  direction: true,
  content: true,
  deliveryStatus: true,
  metadata: true,
  authorType: true,
  createdAt: true,
};

/** Load the active conversation window and preserve its last known product anchor. */
export async function loadConversationHistory(prisma, conversationId, inbound) {
  const historyCutoff = new Date(inbound.createdAt.getTime() - 30 * 60 * 1000);
  const windowHistoryRows = await prisma.chatMessage.findMany({
    where: {
      conversationId,
      createdAt: { gte: historyCutoff, lte: inbound.createdAt },
      deliveryStatus: { not: "FAILED" },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: MESSAGE_SELECT,
  });
  const windowHistory = windowHistoryRows.map((message) =>
    message.id === inbound.id
      ? { ...message, content: inbound.content, metadata: inbound.metadata }
      : message,
  );
  let history = windowHistory;

  if (windowHistory.length < 20) {
    const fallbackHistory = await prisma.chatMessage.findMany({
      where: {
        conversationId,
        createdAt: { lt: historyCutoff },
        deliveryStatus: { not: "FAILED" },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 20 - windowHistory.length,
      select: MESSAGE_SELECT,
    });
    history = [...fallbackHistory.reverse(), ...windowHistory];
  }

  // The newest inbound contains the complete unanswered burst.
  const batchedIds = new Set(inbound.metadata?.batchedMessageIds || []);
  history = history.filter(
    (message) => !batchedIds.has(message.id) || message.id === inbound.id,
  );

  const productAnchor = await prisma.chatMessage.findFirst({
    where: {
      conversationId,
      direction: "OUTBOUND",
      deliveryStatus: { not: "FAILED" },
      createdAt: { lt: history[0]?.createdAt || historyCutoff },
      OR: [
        { metadata: { path: ["selectedProductId"], string_starts_with: "" } },
        { metadata: { path: ["pageProductId"], string_starts_with: "" } },
        { metadata: { path: ["productOptions", "0", "id"], string_starts_with: "" } },
        { metadata: { path: ["productSearchReset"], equals: true } },
      ],
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      direction: true,
      content: true,
      deliveryStatus: true,
      metadata: true,
      authorType: true,
      createdAt: true,
    },
  });

  return { history, productAnchor };
}
