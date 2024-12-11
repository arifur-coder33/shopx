import { replaceNumbers } from "@/utils/engToBanNumber";
import Link from "next/link";
import Imagecustom from "../images/ImageCustom";
import BuyNowButton from "./buyNowButton";
export default function ProductCard({
  productName,
  regularPrice,
  discountPrice,
  imageSrc,
  slug,
}) {
  return (
    <div className="product-card   ">
      <Link href={`/product/${slug}`}>
        <div className="relative">
          <Imagecustom
            sizes="(max-width: 480px) 300px, (max-width: 768px) 300px, 300px"
            className=" rounded-md "
            placeholder="blur"
            src={imageSrc}
            w={300}
            h={300}
            alt={productName}
          />
          {/* <Image
            loader={customLoader}
            alt={productName}
            src={imageSrc}
            className=" rounded-md "
            placeholder="blur"
            blurDataURL="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
            width={300}
            height={300}
          /> */}
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

      <BuyNowButton
        slug={slug}
        className="px-2 border-b-4 w-full bg-sky-500 border-sky-800 hover:bg-sky-400 hover:border-sky-700 py-1 "
      />
    </div>
  );
}
