// src/components/Cart.js
"use client";
import { useCart } from "@/context/CartContext";
import { replaceNumbers } from "@/utils/engToBanNumber";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useMounted } from "@/hooks/useMounted";
const DynamicCartPage = dynamic(() => import("./cart/CartPage"));
const Modal = dynamic(() => import("./Modal"), {
  ssr: false,
});
export default function Cart({ className, children }) {
  const { totalCartQuantity } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const hasMounted = useMounted();
  return (
    <>
      <button type="button" aria-label="কার্ট খুলুন" aria-expanded={isOpen} onClick={() => setIsOpen(true)} className={className ? "relative flex min-h-12 min-w-12 items-center justify-center rounded-brand border-0 bg-transparent p-0 text-inherit cursor-pointer " + className : "relative flex min-h-12 min-w-12 items-center justify-center rounded-brand border-0 bg-transparent p-0 text-inherit cursor-pointer"}>
        {/* <ShoppingCart className={`${className}`} /> */}
        {children}

        {hasMounted && totalCartQuantity > 0 && (
          <span className="absolute -top-2 text-center left-2 text-white rounded-full bg-brand text-base font-bold w-5 h-5 opacity-100">
            {replaceNumbers(totalCartQuantity.toString())}
          </span>
        )}
      </button>

      {isOpen && (
        <Modal
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          openStyle="right"
          contentClassName="overflow-hidden px-3 pb-0 pt-14"
        >
          <DynamicCartPage setIsOpen={setIsOpen} />
        </Modal>
      )}
    </>
  );
}
