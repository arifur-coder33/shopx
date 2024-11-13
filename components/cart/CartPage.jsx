"use client";
import { useCart } from "@/context/CartContext";
import { ShoppingBag } from "lucide-react";
import KalapanaFont from "../KalapanaFont";
import CartItem from "./CartItem";
import { replaceNumbers } from "@/utils/engToBanNumber";
export default function CartPage() {
  const { cartItems , totalCartPrice} = useCart();
  return (
    <div className="">
      <div className="flex flex-row text-purple dark:text-slate-200 font-bold border-b-2 py-2">
        <ShoppingBag />{" "}
        <KalapanaFont>
          <span className="px-2  text-2xl">ব্যাগ</span>
        </KalapanaFont>
      </div>
      {cartItems.length > 0 ? (
        cartItems.map((item) => <CartItem key={item.id} data={item} />)
      ) : (
        <p className="mt-4 text-slate-900 dark:text-slate-200">
          আপনি এখন আপনার ব্যাগে কোন পন্য রাখেননি।
        </p>
      )}
      <div className="bg-black flex flex-col absolute left-0 bottom-0 w-full ">
          <div>
            <p>
              আপনার ব্যাগে <span> মোট {replaceNumbers(totalCartPrice.toString())} টাকার </span>পন্য আছে
            </p>
          </div>
      </div>
    </div>
  );
}
