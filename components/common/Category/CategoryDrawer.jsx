// src/components/Cart.js
"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
// import Modal from "./Modal";
import { useMounted } from "@/hooks/useMounted";
import { LayoutGrid,  AlignJustify } from "lucide-react";
import CategoryTree from "./CategoryTree";
// Dynamically import CartPage. Its code will only be fetched from the server
// when the user clicks the cart icon and `isOpen` becomes true.
// const CategoryTree = dynamic(() => import("./CategoryTree"));
const Modal = dynamic(() => import("@/components/Modal"), {
  ssr: false, // Ensure the modal is only rendered on the client side
});
// import Modal from "@/components/Modal"
export default function CategoryDrawer({ className, children, initialData }) {
  const [isOpen, setIsOpen] = useState(false);
  const hasMounted = useMounted();
  return (
    <>
      <div
        onClick={() => setIsOpen(true)} // Changed to ensure it only opens
        className="relative cursor-pointer"
      >
        {children ||   <AlignJustify className="text-white dark:text-gray-300"/>}
      </div>

      {/* The Modal itself is lightweight. The expensive part is its content. */}
      <Modal isOpen={isOpen} setIsOpen={setIsOpen} openStyle="left">
        {isOpen && (
          <CategoryTree initialData={initialData} setIsOpen={setIsOpen} />
        )}
      </Modal>
    </>
  );
}
