import Image from "next/image";
import { customLoader } from "../images/Images-Loader";
import Link from "next/link";
import KalapanaFont from "../KalapanaFont";
export default function ProductCard({
  productName,
  regularPrice,
  discountPrice,
  imageSrc,
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
          <span className="text-orange-700 font-bold ">
            {" "}
            {discountPrice}-/{" "}
          </span>
          <del className="price-del">{regularPrice}</del>
        </div>
        </div>
  </Link>
 
        <button className={`w-full button `}><KalapanaFont>এখনি কিনুন</KalapanaFont> </button>
      
    </div>
  );
}
