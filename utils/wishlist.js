export const WISHLIST_STORAGE_KEY = "wishlistItems";
export const WISHLIST_CHANGE_EVENT = "wishlist:change";

export function wishlistItemKey(item) {
  return String(item?.slug || item?.id || "")
    .trim()
    .toLocaleLowerCase();
}

function uniqueWishlist(items) {
  const unique = new Map();
  items.forEach((item) => {
    const key = wishlistItemKey(item);
    if (key && !unique.has(key)) unique.set(key, item);
  });
  return Array.from(unique.values());
}

export function readWishlist() {
  if (typeof window === "undefined") return [];

  try {
    const value = JSON.parse(localStorage.getItem(WISHLIST_STORAGE_KEY) || "[]");
    return Array.isArray(value) ? uniqueWishlist(value) : [];
  } catch {
    return [];
  }
}

export function saveWishlist(items) {
  const uniqueItems = uniqueWishlist(items);
  localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(uniqueItems));
  window.dispatchEvent(
    new CustomEvent(WISHLIST_CHANGE_EVENT, { detail: { items: uniqueItems } }),
  );
}

export function toggleWishlistItem(product) {
  const items = readWishlist();
  const productKey = wishlistItemKey(product);
  const exists = items.some((item) => wishlistItemKey(item) === productKey);
  const nextItems = exists
    ? items.filter((item) => wishlistItemKey(item) !== productKey)
    : [product, ...items];

  saveWishlist(nextItems);
  return { items: uniqueWishlist(nextItems), active: !exists };
}
