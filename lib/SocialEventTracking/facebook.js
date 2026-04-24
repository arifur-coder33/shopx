export const FB_MAP = {
  view: "ViewContent",
  add_to_cart: "AddToCart",
  checkout: "InitiateCheckout",
  purchase: "Purchase",
  search: "Search",
};

export function fireFacebook(
  event,
  value,
  currency,
  items,
  eventId,
  extra = {},
) {
  if (typeof window === "undefined" || !window.fbq) return;

  const mappedEvent = FB_MAP[event] || event;

  window.fbq(
    "track",
    mappedEvent,
    {
      value,
      currency,
      content_ids: items.map((i) => i.id),
      content_category: items.map((i) => i.category),
      content_name: items.map((i) => i.name),
      content_type: "product",
      contents: items.map((i) => ({
        id: i.id,
        quantity: i.quantity,
        item_price: i.price,
      })),
      num_items: items.reduce((a, b) => a + (b.quantity || 1), 0),
      // 🔥 SEARCH SPECIAL FIELD
      ...(event === "search" && {
        search_string: extra.search_string,
      }),
    },
    { eventID: eventId }, // 🔥 deduplication
  );
}
