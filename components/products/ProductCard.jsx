import { replaceNumbers } from "@/utils/engToBanNumber";
import Link from "next/link";
import Imagecustom from "../images/ImageCustom"; // Correct path
import BuyNowButton from "./buyNowButton";

export default function ProductCard({ product }) {
  if (!product) {
    return <div className="text-red-500">Product not found</div>;
  }
  const { hasVariations, regularPrice, discountPrice, variations } =
    product || {};

  let regularPriceValue = regularPrice;
  let discountPriceValue = discountPrice || regularPrice;

  if (hasVariations && Array.isArray(variations) && variations.length > 0) {
    regularPriceValue = Math.min(...variations.map((v) => v.regularPrice));
    discountPriceValue = Math.min(
      ...variations.map((v) => v.discountPrice ?? v.regularPrice)
    );
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
            <Imagecustom
              src={product?.mainImage || product?.thumbnail?.name}
              alt={product?.title}
              w={230}
              h={230}
              objectFit="cover"
              sizes="(max-width: 480px) 150px, (max-width: 768px) 200px, 300px"
              imageClassName="transition-opacity duration-300 ease-in-out"
              priority={false}
              quality={75}
            />
          </div>
          <div className="p-2">
            <div className="line-clamp-2 ">{product?.title}</div>
            <div className="px-2 cursor-auto">
              <span className="text-purple font-bold text-xl md:text-2xl">
                {replaceNumbers(
                  (discountPriceValue > 0
                    ? discountPriceValue
                    : regularPriceValue
                  ).toString()
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
