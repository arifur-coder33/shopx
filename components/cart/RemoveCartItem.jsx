"use client";
import { useCart } from "@/context/CartContext";
import { Trash2 } from "lucide-react";
export default function RemoveCartItem({ productId, productName }) {
  const { removeFromCart } = useCart();
  return (
    <button
      type="button"
      aria-label={`${productName || "পণ্য"} ব্যাগ থেকে সরান`}
      onClick={() => {
        removeFromCart(productId);
      }}
      className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-500 transition-colors hover:bg-red-100"
    >
      <Trash2 className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
