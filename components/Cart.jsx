"use client";
import { useCart } from "@/context/CartContext";
import { replaceNumbers } from "@/utils/engToBanNumber";
import { ShoppingCart } from "lucide-react";
import { useState } from "react";
import Drawer from "./Drawer";
import CartItem from "./cart/CartItem";
import CartPage from "./cart/CartPage";
export default function Cart() {
  const { totalCartQuantity } = useCart();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="relative cursor-pointer "
      >
        <ShoppingCart />
        <span className="absolute -top-2 text-center  left-2 text-white rounded-full bg-purple text-base font-bold w-5 h-5 opacity-100 ">
          {" "}
          {replaceNumbers(totalCartQuantity.toString())}
        </span>
      </div>
      <Drawer isOpen={isOpen} setIsOpen={setIsOpen} title={`${<ShoppingCart/>}`} > 
       <CartPage/>
        </Drawer>
    </>
  );
}
