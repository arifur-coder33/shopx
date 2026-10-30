/** Resolve a quoted outbound chat message and a product selected from its card. */
export async function resolveChatReplyTarget(prisma, conversationId, messageId, requestedProductId = null) {
  if (!messageId) return { valid: true, replyTo: null };
  const quoted = await prisma.chatMessage.findFirst({
    where: { id: messageId, conversationId, direction: "OUTBOUND" },
    select: { id: true, content: true, direction: true, authorType: true, metadata: true },
  });
  if (!quoted) return { valid: false, replyTo: null };
  const productIds = [
    quoted.metadata?.image?.productId,
    quoted.metadata?.selectedProductId,
    ...(quoted.metadata?.productOptions || []).map((product) => product.id),
  ].filter(Boolean);
  if (requestedProductId && !productIds.includes(requestedProductId)) return { valid: false, replyTo: null };
  const productId = requestedProductId || (productIds.length === 1 ? productIds[0] : null);
  return {
    valid: true,
    replyTo: {
      id: quoted.id,
      content: String(quoted.content || "").slice(0, 300),
      direction: quoted.direction,
      authorType: quoted.authorType,
      ...(productId && { productId }),
    },
  };
}
