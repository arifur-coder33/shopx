export const RECENTLY_VIEWED_PRODUCTS_KEY = "shopzy-recently-viewed-products-v1";
export const RECENTLY_VIEWED_PRODUCTS_EVENT = "shopzy:recently-viewed-products-change";
const MAX_RECENTLY_VIEWED_PRODUCTS = 20;

function readStoredProducts() {
  try {
    const value = JSON.parse(window.localStorage.getItem(RECENTLY_VIEWED_PRODUCTS_KEY) || "[]");
    return Array.isArray(value) ? value.filter((item) => item?.id && item?.slug && item?.title) : [];
  } catch {
    return [];
  }
}

function saveProducts(products) {
  try {
    window.localStorage.setItem(RECENTLY_VIEWED_PRODUCTS_KEY, JSON.stringify(products));
    window.dispatchEvent(new Event(RECENTLY_VIEWED_PRODUCTS_EVENT));
    return true;
  } catch {
    return false;
  }
}

export function readRecentlyViewedProducts() {
  if (typeof window === "undefined") return [];
  return readStoredProducts();
}

export function recordRecentlyViewedProduct(product) {
  if (typeof window === "undefined" || !product?.id || !product?.slug || !product?.title) return [];
  const numericOrNull = (value) => value == null || value === "" || !Number.isFinite(Number(value))
    ? null
    : Number(value);
  const saved = {
    id: String(product.id),
    slug: String(product.slug),
    title: String(product.title),
    image: product.image ? String(product.image) : null,
    hasVariations: Boolean(product.hasVariations),
    regularPrice: numericOrNull(product.regularPrice),
    discountPrice: numericOrNull(product.discountPrice),
  };
  const products = [saved, ...readStoredProducts().filter((item) => item.id !== saved.id)]
    .slice(0, MAX_RECENTLY_VIEWED_PRODUCTS);
  return saveProducts(products) ? products : [];
}

export function removeRecentlyViewedProduct(productId) {
  if (typeof window === "undefined" || !productId) return [];
  const products = readStoredProducts().filter((item) => item.id !== productId);
  return saveProducts(products) ? products : [];
}
