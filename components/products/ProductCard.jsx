import { replaceNumbers } from "@/utils/engToBanNumber";
import Link from "next/link";
import Imagecustom from "../images/ImageCustom";
import BuyNowButton from "./buyNowButton";
export default function ProductCard({ product }) {
  return (
    <div>
      <div className="product-card   ">
        <Link href={`/product/${encodeURIComponent(product?.slug)}`}>
          <div className="relative">
            <Imagecustom
              sizes="(max-width: 480px) 300px, (max-width: 768px) 300px, 300px"
              className=" rounded-md "
              placeholder="blur"
              src={product?.mainImage || product?.thumbnail?.name}
              w={300}
              h={300}
              alt={product?.title}
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
          className="px-2 border-b-4 w-full  border-orange-800  hover:border-orange-700 py-1 "
          product={product}
        />
      </div>
    </div>
  );
}
