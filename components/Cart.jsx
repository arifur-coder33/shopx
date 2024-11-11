'use client'
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { replaceNumbers } from "@/utils/engToBanNumber";
export default function Cart() {
  const {totalCartQuantity}=useCart()

  return (
    <div className="relative ">
      <ShoppingCart className=" text-slate-200" />
      <span className="absolute -top-4  left-2 bg-white rounded-full text-purple-800 text-base font-bold w-5 h-5 opacity-100 "> {replaceNumbers(totalCartQuantity.toString()) }</span>
    </div>
  )
}
