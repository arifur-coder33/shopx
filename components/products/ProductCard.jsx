import { replaceNumbers } from "@/utils/engToBanNumber";
import Link from "next/link";
import Imagecustom from "../images/ImageCustom"; // Correct path
import BuyNowButton from "./buyNowButton";

export default function ProductCard({ product }) {
  return (
    <div>
      <div className="product-card">
        <Link href={`/product/${encodeURIComponent(product?.slug)}`}>
          <div className="relative aspect-square w-full">
            {" "}
            {/* Or some other way to define size/aspect ratio */}
            <Imagecustom
              src={product?.mainImage || product?.thumbnail?.name}
              alt={product?.title}
              // Option 1: Use width and height (objectFit will apply within these bounds)
              w={230} // Desired display width
              h={230} // Desired display height
              objectFit="cover" // How the image fits into w/h
              sizes="(max-width: 480px) 150px, (max-width: 768px) 200px, 300px" // Adjust based on your layout
              // Pass specific classes to the Next/Image component
              imageClassName="transition-opacity duration-300 ease-in-out" // Example: for opacity transition with blur
              // wrapperClassName for the placeholder div if needed
              // wrapperClassName="bg-gray-200"
              priority={false} // Example: Set true for first few items above the fold
              quality={75}
            />
          </div>
          <div className="p-2">
            <div className="line-clamp-2 ">{product?.title}</div>
            <div className="px-2 cursor-auto">
              <span className="text-purple font-bold text-xl md:text-2xl">
                {replaceNumbers(product?.discountPrice?.toString())}-/{" "}
              </span>
              <del className="price-del">
                {replaceNumbers(product?.regularPrice?.toString())}
              </del>
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
