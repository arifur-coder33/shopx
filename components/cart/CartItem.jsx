import { replaceNumbers } from "@/utils/engToBanNumber";
import Image from "next/image";
import RemoveCartItem from "./RemoveCartItem";

export default function CartItem({ data, removeItem }) {
  const { title, discountPrice, id, mainImage, quantity } = data || {};

  const totalPrice = discountPrice * quantity;
  return (
    <div className="grid grid-cols-12 gap-1 w-full text-[12px] text-slate-900 dark:text-slate-200 p-2 mt-2 border-2 items-center dark:border-slate-800 border-gray-500 rounded-md ">
      <div className="col-span-3">
        {/* <Imagecustom
          sizes="(max-width: 480px) 75px, (max-width: 768px) 100px"
          alt={title}
          src={images[0]}
          w={75}
          h={75}
          priority={true}
        /> */}
        <Image
          sizes="50px"
          blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAgMBAQUAdo4AAAAASUVORK5CYII="
          width={75}
          height={75}
          alt={title}
          src={mainImage}
          priority
        />
      </div>
      <div className="col-span-8 leading-none ">
        <h1 className="text-base line-clamp-1">{title}</h1>
        <div className="grid p-0 m-0 grid-cols-2">
          <span>Size: xL</span>
          <span>Size: black</span>
          <span>পরিমান: {replaceNumbers(quantity?.toString())}</span>
          <span>মূল্য: {replaceNumbers(discountPrice?.toString())} টাকা </span>
        </div>
      </div>
      {removeItem !== "hide" && (
        <div className="col-span-1 cursor-pointer">
          <RemoveCartItem productId={id} />
        </div>
      )}
      <div className="col-span-12 text-center text-white bg-gray-500 dark:bg-slate-800">
        মোট মুল্যঃ {replaceNumbers(totalPrice.toString())} টাকা
      </div>
    </div>
  );
}
