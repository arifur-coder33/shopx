import { replaceNumbers } from "@/utils/engToBanNumber";
import { Star, Truck } from "lucide-react";
import Link from "next/link";
import ImageCustomServer from "../images/ImageCustomServer";
import WishlistButton from "../wishlist/WishlistButton";
import ProductCardActions from "./ProductCardActions";
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
  const displayPrice = product.campaignPrice > 0 ? product.campaignPrice : price;
  const showDiscount = Number(product.campaignDiscountPercent) > 0;
  const comboOffer = product.comboOffers?.[0];
  const comboRewards = comboOffer?.rewardProducts?.length
    ? comboOffer.rewardProducts
    : comboOffer ? [{ id: comboOffer.id, name: comboOffer.rewardProductName, thumbnail: comboOffer.rewardProductThumbnail }] : [];
  const crossedPrice = displayPrice < price ? price : discountPrice > 0 ? regularPrice : null;
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
        <Link href={`/product/${encodeURIComponent(product?.slug)}`}>
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
            {showDiscount && <span className="absolute left-2 top-2 z-[1] rounded-full bg-red-600 px-2 py-1 text-xs font-bold leading-none text-white shadow-sm">{replaceNumbers(`${product.campaignDiscountPercent}% OFF`)}</span>}
            {comboOffer && <div className="absolute bottom-2 right-2 z-[2] flex max-w-[104px] flex-col items-center gap-0.5 rounded-md border border-border bg-surface/95 p-1 shadow-md" title={comboRewards.map((reward) => reward.name).join(", ")} aria-label={`${comboRewards.length} reward products: ${comboOffer.badge}`}><div className="flex items-center gap-0.5">{comboRewards.slice(0, 2).map((reward) => <ImageCustomServer key={reward.id} src={reward.thumbnail} alt={reward.name || "Combo reward product"} w={56} h={56} className="h-8 w-8 rounded object-cover" sizes="32px" />)}{comboRewards.length > 2 && <span className="grid h-8 min-w-8 place-items-center rounded bg-primary-soft px-1 text-[10px] font-bold text-primary">+{replaceNumbers(String(comboRewards.length - 2))}</span>}</div><span className="text-[9px] font-black leading-none text-brand sm:text-[10px]">{comboOffer.badge}</span></div>}
            {product.deliveryCampaignLabel && <span className="absolute bottom-0 left-0 z-[1] block w-[78px] overflow-hidden rounded-md border border-brand bg-surface/95 shadow-md sm:w-[90px]" aria-label={product.deliveryCampaignLabel}>
              <span className="flex h-5 items-center justify-between gap-1 px-1 sm:h-6 sm:px-1.5">
                <span className="text-xs font-black italic leading-none tracking-tight text-brand sm:text-sm">FREE</span>
                <Truck aria-hidden="true" className="h-4 w-5 shrink-0 text-brand sm:h-5 sm:w-6" strokeWidth={2.5} />
              </span>
              <span className="block bg-brand px-1 py-0.5 text-center text-[7px] font-black italic leading-none tracking-[0.1em] text-white sm:px-1.5 sm:text-[8px]">DELIVERY</span>
              {product.deliveryCampaignLabel !== "Free delivery" && <span className="block truncate px-1 py-0 text-center text-[6px] font-semibold leading-tight text-brand sm:text-[7px]">{product.deliveryCampaignLabel.replace(/^Free delivery/i, "").trim()}</span>}
            </span>}
          </div>
          <div className="p-1.5 sm:p-2">
            <h3 className="line-clamp-2 min-h-12 text-sm leading-6 sm:text-base">
              {title}
            </h3>

            <div className="cursor-auto">
              <span className="text-base font-bold text-brand sm:text-xl">
                {replaceNumbers(
                  displayPrice.toString(),
                )}
                -/{" "}
              </span>
              {crossedPrice > 0 && (
                <del className="price-del">
                  {replaceNumbers(crossedPrice.toString())}
                </del>
              )}
            </div>
            {Number(product.reviewCount) > 0 && <div className="mt-0.5 flex items-center gap-1 text-xs text-text-muted" aria-label={`${Number(product.reviewRating || 0).toFixed(1)} out of 5 from ${product.reviewCount} reviews`}>
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" aria-hidden="true" />
              <span className="font-semibold text-text">{Number(product.reviewRating || 0).toFixed(1)}</span>
              <span>({replaceNumbers(String(product.reviewCount))} রিভিউ)</span>
            </div>}
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
          <ProductCardActions slug={product.slug} checkoutTracking={checkoutTracking} />
        )}
      </div>
    </article>
  );
}
