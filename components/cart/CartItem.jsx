import IncrementNDcrement from "@/components/products/incrementNDcrement";
import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
import { replaceNumbers } from "@/utils/engToBanNumber";
import Image from "next/image";
import RemoveCartItem from "./RemoveCartItem";

export default function CartItem({
  data,
  setProductQy,
  productQty = 1,
  removeItem,
}) {
  const { title, discountPrice, id, mainImage } = data || {};

  return (
    <div className="grid grid-cols-12 gap-1 w-full text-[12px] text-slate-900 dark:text-slate-200 p-2 mt-2 border-2 items-center dark:border-slate-800 border-gray-500 rounded-md ">
      <div className="col-span-3">
        <Image
          sizes="50px"
          blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAgMBAQUAdo4AAAAASUVORK5CYII="
          width={75}
          height={75}
          alt={title}
          src={cloudinaryMainImage(mainImage, 100, 100)}
          priority
          unoptimized
        />
      </div>
      <div className="col-span-8 leading-none ">
        <h1 className="text-base line-clamp-1">{title}</h1>
        <div className="grid p-0 m-0 grid-cols-2 gap-1">
          {data?.size && <span>সাইজ: {data?.size}</span>}
          {data?.color && <span>কালার: {data?.color}</span>}

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
          <RemoveCartItem productId={id} />
        </div>
      )}

      <div className="col-span-12 text-center text-white bg-gray-500 dark:bg-slate-800">
        মোট: {replaceNumbers(discountPrice?.toString())} x{" "}
        {replaceNumbers(productQty.toString())} ={" "}
        {replaceNumbers((discountPrice * productQty).toString())}টাকা
      </div>
    </div>
  );
}
