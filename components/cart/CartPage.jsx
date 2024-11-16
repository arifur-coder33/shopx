"use client";
import { useCart } from "@/context/CartContext";
import { replaceNumbers } from "@/utils/engToBanNumber";
import { ShoppingBag } from "lucide-react";
import Button from "../button";
import KalapanaFont from "../KalapanaFont";
import CartItem from "./CartItem";
export default function CartPage() {
  const { cartItems, totalCartPrice } = useCart();
  return (
    <div className="relative  h-full ">
      <div className="flex flex-row text-purple dark:text-slate-200 font-bold border-b-2 justify-center">
        <ShoppingBag />{" "}
        <KalapanaFont>
          <span className=" text-2xl">ব্যাগ</span>
        </KalapanaFont>
      </div>
      {cartItems.length > 0 ? (
        <>
          {cartItems.map((item) => (
            <CartItem key={item.id} data={item} />
          ))}
          <div className="text-white text-center w-full bg-gray-500 dark:bg-slate-800 p-2 absolute left-0 bottom-0 rounded-lg  ">
            <p className="text-[13px]">
              আপনার ব্যাগে মোট{" "}
              <span className="font-bold">
                {" "}
                {replaceNumbers(totalCartPrice.toString())}
              </span>{" "}
              টাকার পন্য আছে
            </p>
            <Button className={"text-lg md:text-xl px-2 py-1 tracking-normal"}>
              ব্যাগের পন্য গুলো অর্ডার করুন
            </Button>
          </div>
        </>
      ) : (
        <p className="mt-4 text-slate-900 dark:text-slate-200">
          আপনি এখন আপনার ব্যাগে কোন পন্য রাখেননি।
        </p>
      )}
    </div>
  );
}
