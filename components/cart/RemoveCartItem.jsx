"use client";
import { useCart } from "@/context/CartContext";
import { OctagonX } from "lucide-react";
export default function RemoveCartItem({ productId }) {
  const { removeFromCart } = useCart();
  return (
    <span
      onClick={() => {
        removeFromCart(productId);
      }}
      className="text-red-500/80 hover:text-red-500   "
    >
      <OctagonX style={{ color: "red" }} />
    </span>
  );
}
