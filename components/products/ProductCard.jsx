import { replaceNumbers } from "@/utils/engToBanNumber";
import Link from "next/link";
import ImageCustomServer from "../images/ImageCustomServer";
import BuyNowButton from "./buyNowButton";

export default function ProductCard({ product, index }) {
  if (!product) {
    return <div className="text-red-500">Product not found</div>;
  }
  const { hasVariations, variations } = product || {};

  let regularPriceValue = 0;
  let discountPriceValue = 0;

  if (
    hasVariations &&
    Array.isArray(variations[0].combinations) &&
    variations[0]?.combinations?.length > 0
  ) {
    regularPriceValue = Math.min(...variations.map((v) => v.regularPrice));
    discountPriceValue = Math.min(
      ...variations.map((v) => v.discountPrice ?? v.regularPrice),
    );
  } else {
    regularPriceValue =
      variations?.length === 1 ? variations[0]?.regularPrice : 0;
    discountPriceValue =
      variations?.length === 1 ? variations[0]?.discountPrice : 0;
  }

  // If discount is not actually lower, don't show it
  if (discountPriceValue >= regularPriceValue) {
    discountPriceValue = 0;
  }

  return (
    <div>
      <div className="product-card">
        <Link href={`/product/${encodeURIComponent(product?.slug)}`}>
          <div className="relative aspect-square w-full">
            <ImageCustomServer
              src={product?.mainImage || product?.thumbnail?.name}
              alt={product?.title}
              w={230}
              h={230}
              className="rounded-md object-cover w-full h-full"
              sizes="(max-width: 480px) 150px, (max-width: 768px) 200px, 300px"
              quality={75}
              priority={index < 5} // Crucial for performance
            />
          </div>
          <div className="p-2">
            <div className="line-clamp-2 ">{product?.title}</div>
            <div className="px-2 cursor-auto">
              <span className="text-brand font-bold text-xl md:text-2xl">
                {replaceNumbers(
                  (discountPriceValue > 0
                    ? discountPriceValue
                    : regularPriceValue
                  ).toString(),
                )}
                -/{" "}
              </span>
              {discountPriceValue > 0 && (
                <del className="price-del">
                  {replaceNumbers(regularPriceValue?.toString())}
                </del>
              )}
            </div>
          </div>
        </Link>

        <BuyNowButton
          className="px-2 border-b-4 w-full border-orange-800 hover:border-orange-700 py-1"
          product={product}
        />
      </div>
    </div>
  );
}
