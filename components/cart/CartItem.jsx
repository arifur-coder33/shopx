"use state";
import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
import { replaceNumbers } from "@/utils/engToBanNumber";
import Image from "next/image";
import { useEffect, useState } from "react";
import IncrementNDcrement from "../products/incrementNDcrement";
import RemoveCartItem from "./RemoveCartItem";

export default function CartItem({
  data,
  removeItem,
  addToCart,
  reduceCartQty,
  setProductQty,
}) {
  const { title, discountPrice, id, mainImage, quantity } = data || {};
  const [qty, setQty] = useState(quantity || 1);
  const [totalPrice, setTotalPrice] = useState(discountPrice * qty);

  const qtyHandler = (qty) => {
    setQty(qty);
  };
  useEffect(() => {
    if (quantity > 1) {
      setQty(quantity);
    }
  }, [quantity]);
  useEffect(() => {
    if (setProductQty) {
      setProductQty(qty);
    }
    setTotalPrice(discountPrice * qty);
  }, [qty, discountPrice]);

  return (
    <div className="grid grid-cols-12 gap-1 w-full text-[12px] text-slate-900 dark:text-slate-200 p-2 mt-2 border-2 items-center dark:border-slate-800 border-gray-500 rounded-md ">
      <div className="col-span-3">
        <Image
          sizes="50px"
          blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAgMBAQUAdo4AAAAASUVORK5CYII="
          width={75}
          height={75}
          alt={title}
          src={cloudinaryMainImage(mainImage)}
          priority
        />
        {/* <Imagecustom
          src={mainImage}
          w={50}
          h={50}
          alt={data?.title}
          priority={true}
        /> */}
      </div>
      <div className="col-span-8 leading-none ">
        <h1 className="text-base line-clamp-1">{title}</h1>
        <div className="grid p-0 m-0 grid-cols-2 gap-1">
          <span>Size: xL</span>
          <span>Size: black</span>
          <div className="flex flex-row items-center col-span-full">
            <span className="flex flex-row items-center">
              <label htmlFor="qtyinput"> পরিমান: </label>
              <IncrementNDcrement
                qtyHandler={qtyHandler}
                quantity={qty}
                addToCart={addToCart}
                reduceCartQty={reduceCartQty}
                style={"simple"}
                id={id}
              />
            </span>
          </div>
        </div>
      </div>
      {removeItem !== "hide" && (
        <div className="col-span-1 cursor-pointer">
          <RemoveCartItem productId={id} />
        </div>
      )}

      <div className="col-span-12 text-center text-white bg-gray-500 dark:bg-slate-800">
        মোট: {replaceNumbers(discountPrice?.toString())} x{" "}
        {replaceNumbers(qty.toString())} ={" "}
        {replaceNumbers(totalPrice.toString())}টাকা
      </div>
    </div>
  );
}
