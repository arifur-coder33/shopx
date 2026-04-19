// src/components/Cart.js
"use client";
import { useCart } from "@/context/CartContext";
import { replaceNumbers } from "@/utils/engToBanNumber";
import dynamic from "next/dynamic";
import { useState } from "react";
// import Modal from "./Modal";
import { useMounted } from "@/hooks/useMounted";
// Dynamically import CartPage. Its code will only be fetched from the server
// when the user clicks the cart icon and `isOpen` becomes true.
const CategoryBarData = dynamic(() => import("./CategoryBarData"));
const Modal = dynamic(() => import("@/components/Modal"), {
  ssr: false, // Ensure the modal is only rendered on the client side
});
export default function CategorySidebar({ className, children }) {
  const { totalCartQuantity } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const hasMounted = useMounted();
  return (
    <>
      <div
        onClick={() => setIsOpen(true)} // Changed to ensure it only opens
        className="relative cursor-pointer"
      >
        {/* <ShoppingCart className={`${className}`} /> */}
        {children}

        {hasMounted && totalCartQuantity > 0 && (
          <span className="absolute -top-2 text-center left-2 text-white rounded-full bg-purple text-base font-bold w-5 h-5 opacity-100">
            {replaceNumbers(totalCartQuantity.toString())}
          </span>
        )}
      </div>

      {/* The Modal itself is lightweight. The expensive part is its content. */}
      <Modal isOpen={isOpen} setIsOpen={setIsOpen} openStyle="left">
        {/* 
          We conditionally render the DynamicCartPage. Because it's a dynamic import,
          React will suspend while it fetches the component's code the first time.
          This happens ONLY after the user clicks.
        */}
        {isOpen && <CategoryBarData setIsOpen={setIsOpen} />}
      </Modal>
    </>
  );
}
