import { replaceNumbers } from "@/utils/engToBanNumber";
import Link from "next/link";
import ImageCustomServer from "../images/ImageCustomServer";
import CardBuyNow from "./CardBuyNow";
export default function ProductCard({ product, index }) {
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

  return (
    <div>
      <div className="product-card">
        <Link
          href={`/product/${encodeURIComponent(product?.slug)}`}
          prefetch={true}
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
              fetchPriority={index < 5 ? "high" : "low"} // Prioritize the first few images for better performance
              priority={index < 5} // Crucial for performance
            />
          </div>
          <div className="p-2">
            <div className="line-clamp-2 ">{title}</div>
            <div className="px-2 cursor-auto">
              <span className="text-brand font-bold text-xl md:text-2xl">
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
        <CardBuyNow product={product}>
          <Link
            className="bg-brand text-white text-center block py-2 border-b-4 border-orange-800 hover:border-orange-700 w-full"
            href={`${!hasVariations ? `/buynow/${encodeURIComponent(product?.slug)}` : `/product/${encodeURIComponent(product?.slug)}`}`}
          >
            {hasVariations ? "Select Options" : "Buy Now"}
          </Link>
        </CardBuyNow>
      </div>
    </div>
  );
}
