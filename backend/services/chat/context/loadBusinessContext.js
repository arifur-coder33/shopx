/** Fetch product and verified-order data together for the AI decision stage. */
export async function loadBusinessContext({
  getCatalog,
  getVerifiedOrders,
  customerText,
  selectedProductIds,
  categoryIds,
  conversation,
  history,
  aiConfig,
  forceCatalogSearch = false,
  customerImage = false,
}) {
  const [products, orders] = await Promise.all([
    customerImage && !selectedProductIds.length
      ? Promise.resolve({ products: [], categories: [] })
      : getCatalog(
          customerText,
          [],
          conversation.channel,
          selectedProductIds,
          categoryIds,
          aiConfig,
          forceCatalogSearch,
        ),
    getVerifiedOrders(conversation, customerText, history),
  ]);

  return { products, orders };
}
