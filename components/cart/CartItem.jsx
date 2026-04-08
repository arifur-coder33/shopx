import IncrementNDcrement from "@/components/products/incrementNDcrement";
import { replaceNumbers } from "@/utils/engToBanNumber";
import Link from "next/link";
import Imagecustom from "../images/ImageCustom";
import RemoveCartItem from "./RemoveCartItem";

export default function CartItem({
  title,
  thumbnail,
  slug,
  discountPrice,
  regularPrice,
  setProductQy,
  productQty = 1,
  removeItem,
  variation = null,
  id,
}) {
  const product = {
    id,
    variation,
  };
  return (
    <div className="grid grid-cols-12  gap-1 w-full text-[12px] text-slate-900 dark:text-slate-200 p-2  pr-3 mt-2 border-2 items-center dark:border-slate-800 border-gray-500 rounded-md ">
      <div className="col-span-3">
        <Imagecustom
          src={thumbnail}
          alt={title}
          w={60}
          h={60}
          objectFit="cover"
          sizes="(max-width: 480px) 75px, (max-width: 768px) 100px, 150px"
          imageClassName="transition-opacity duration-300 ease-in-out"
          priority={true}
          quality={75}
        />
      </div>
      <div className="col-span-8 leading-none ">
        <Link href={`/product/${slug}`}>
          <h1 className="text-base ">{title}</h1>
        </Link>
        <div className="grid p-0 m-0 grid-cols-2 gap-1">
          <div className="flex flex-wrap flex-row items-center gap-1 col-span-full">
            {variation &&
              variation?.combinations.length > 0 &&
              variation.combinations.map((item, index) => (
                <span
                  key={index}
                  className=" border-2  rounded-full px-2 py-1 text-[9px]"
                >
                  {item?.variationName?.name} : {item.variationValue.value}
                </span>
              ))}
          </div>

          <div className="flex flex-row items-center col-span-full">
            <span className="flex flex-row items-center">
              <label htmlFor="qtyinput"> পরিমান: </label>
              <IncrementNDcrement
                incrementHandler={setProductQy}
                decrementHandler={setProductQy}
                initialQty={productQty}
                style={"simple"}
                id={id}
              />
            </span>
          </div>
        </div>
      </div>
      {!removeItem && (
        <div className="col-span-1 cursor-pointer">
          <RemoveCartItem productId={product} />
        </div>
      )}

      <div className="col-span-12 text-center text-white bg-gray-500 dark:bg-slate-800">
        মোট: {replaceNumbers((discountPrice || regularPrice)?.toString())} x{" "}
        {replaceNumbers(productQty.toString())} ={" "}
        {replaceNumbers(
          ((discountPrice || regularPrice) * productQty).toString(),
        )}
        টাকা
      </div>
    </div>
  );
}
