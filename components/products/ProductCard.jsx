import { replaceNumbers } from "@/utils/engToBanNumber";
import Link from "next/link";
import ImageCustomServer from "../images/ImageCustomServer";
import WishlistButton from "../wishlist/WishlistButton";
export default function ProductCard({ product, priority = false }) {
  if (!product) {
    return <div className="text-red-500">Product not found</div>;
  }
  const {
    hasVariations,
    discountPrice,
    regularPrice,
    title,

    thumbnail,
  } = product || {};
  const price = discountPrice > 0 ? discountPrice : regularPrice;
  const categoryName =
    typeof product.category === "string"
      ? product.category
      : product.category?.name;
  const checkoutTracking = !hasVariations
    ? JSON.stringify({
        id: product.id,
        title,
        slug: product.slug,
        price,
        category: categoryName,
      })
    : undefined;

  return (
    <article className="h-full min-w-0">
      <div className="product-card relative flex h-full flex-col">
        <WishlistButton
          product={product}
          className="absolute right-2 top-2 z-10"
        />
        <Link
          href={`/product/${encodeURIComponent(product?.slug)}`}
        >
          <div className="relative aspect-square w-full">
            <ImageCustomServer
              src={product?.mainImage || thumbnail?.name}
              alt={title}
              w={230}
              h={230}
              className="rounded-md object-cover w-full h-full"
              sizes="(max-width: 480px) 150px, (max-width: 768px) 200px, 300px"
              quality={75}
              fetchPriority={priority ? "high" : "low"}
              priority={priority}
            />
          </div>
          <div className="p-1.5 sm:p-2">
            <h3 className="line-clamp-2 min-h-12 text-sm leading-6 sm:text-base">{title}</h3>
            <div className="cursor-auto">
              <span className="text-base font-bold text-brand sm:text-xl">
                {replaceNumbers(
                  (discountPrice > 0 ? discountPrice : regularPrice).toString(),
                )}
                -/{" "}
              </span>
              {discountPrice > 0 && (
                <del className="price-del">
                  {replaceNumbers(regularPrice?.toString())}
                </del>
              )}
            </div>
          </div>
        </Link>

        {/* <BuyNowButton
          className="px-2 border-b-4 w-full border-orange-800 hover:border-orange-700 py-1"
          product={product}
        /> */}
        {hasVariations ? (
          <Link
            className="mt-auto block min-h-11 w-full rounded-brand bg-brand px-2 py-2 text-center font-semibold"
            href={`/product/${encodeURIComponent(product?.slug)}`}
          >
            Select Options
          </Link>
        ) : (
          <div className="mt-auto grid grid-cols-2 gap-1.5">
            <button
              type="button"
              data-product-card-cart={product.slug}
              className="min-h-11 rounded-brand border border-primary px-1 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary-soft disabled:cursor-wait disabled:opacity-60 sm:text-base"
            >
              ব্যাগে রাখুন
            </button>
            <Link
              className="min-h-11 rounded-brand bg-brand px-1 py-2 text-center text-sm font-semibold sm:text-base"
              href={`/buynow/${encodeURIComponent(product?.slug)}`}
              data-checkout-product={checkoutTracking}
            >
              Buy Now
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}
