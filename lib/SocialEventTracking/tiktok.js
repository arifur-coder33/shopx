export const TT_MAP = {
  view: "ViewContent",
  add_to_cart: "AddToCart",
  checkout: "InitiateCheckout",
  purchase: "CompletePayment",
  search: "Search",
};

export function fireTikTok(event, value, currency, items, extra = {}) {
  if (typeof window === "undefined" || !window.ttq) return;

  const mappedEvent = TT_MAP[event] || event;

  window.ttq.track(mappedEvent, {
    value,
    currency,
    ...(event === "search" && {
      search_string: extra.search_string,
    }),
    contents: items.map((i) => ({
      content_id: i.id,
      quantity: i.quantity,
      price: i.price,
    })),
    content_type: "product",
  });
}
