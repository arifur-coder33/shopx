import Image from "next/image";
import { customLoader } from "../images/Images-Loader";
export default function ProductCard({
  productName,
  regularPrice,
  discountPrice,
  imageSrc,
}) {
  return (
    <div className="product-card ">
      {/* <Image
        className="rounded-md"
        src={`https://images.unsplash.com/flagged/photo-1556637640-2c80d3201be8?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8M3x8c25lYWtlcnxlbnwwfHwwfHw%3D&auto=format&fit=crop&w=500&q=60`}
        height={300}
        width={300}
        alt="product name"
        priority
      /> */}
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
          priority
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

        <button className="w-full button ">এখনি কিনুন</button>
      </div>
    </div>
  );
}
