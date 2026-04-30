export const GOOGLE_MAP = {
  view: "view_item",
  add_to_cart: "add_to_cart",
  checkout: "begin_checkout",
  purchase: "purchase",
  search: "view_search_results",
};

export function fireGoogle(event, value, currency, items, extra = {}) {
  if (typeof window === "undefined" || !window.gtag) return;

  const mappedEvent = GOOGLE_MAP[event] || event;

  window.gtag("event", mappedEvent, {
    value,
    currency,
    items: items.map((i) => ({
      item_id: i.id,
      item_name: i.name,
      price: i.price,
      quantity: i.quantity,
    })),
    ...(event === "search" && {
      search_term: extra.search_string,
    }),
  });
}
