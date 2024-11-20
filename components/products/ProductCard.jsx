import { replaceNumbers } from "@/utils/engToBanNumber";
import Image from "next/image";
import Link from "next/link";
import { customLoader } from "../images/Images-Loader";
import BuyNowButton from "./buyNowButton";
export default function ProductCard({
  productName,
  regularPrice,
  discountPrice,
  imageSrc,
  productId,
}) {
  return (
    <div className="product-card ">
      <Link href={`/product/applephone`}>
        <div className="relative">
          <Image
            loader={customLoader}
            alt={productName}
            src={imageSrc}
            className=" rounded-md "
            placeholder="blur"
            blurDataURL="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
            width={300}
            height={300}
          />
        </div>
        <div className="p-2">
          <div className="line-clamp-2 ">{productName}</div>
          <div className="px-2 cursor-auto">
            <span className="text-purple font-bold text-xl md:text-2xl">
              {replaceNumbers(discountPrice.toString())}-/{" "}
            </span>
            <del className="price-del">
              {replaceNumbers(regularPrice.toString())}
            </del>
          </div>
        </div>
      </Link>

      <BuyNowButton productId={productId} className="w-full" />
    </div>
  );
}
