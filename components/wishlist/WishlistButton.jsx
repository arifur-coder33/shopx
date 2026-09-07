import { Heart } from "lucide-react";

export default function WishlistButton({ product, className = "" }) {
  if (!product?.id) return null;

  const payload = JSON.stringify({
    id: product.id,
    slug: product.slug,
    title: product.title,
    regularPrice: Number(product.regularPrice) || 0,
    discountPrice: Number(product.discountPrice) || 0,
    image: product.thumbnail?.name || product.mainImage || "",
    hasVariations: Boolean(product.hasVariations),
  });

  return (
    <button
      type="button"
      aria-label={`${product.title} পছন্দের তালিকায় যোগ করুন`}
      aria-pressed="false"
      data-wishlist-button
      data-wishlist-product={payload}
      data-wishlist-active="false"
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface/95 text-text-muted shadow-sm transition-colors hover:border-primary hover:text-primary data-[wishlist-active=true]:border-primary data-[wishlist-active=true]:bg-primary data-[wishlist-active=true]:text-white data-[wishlist-active=true]:[&_svg]:fill-current ${className}`}
    >
      <Heart className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
