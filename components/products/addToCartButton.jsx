"use client";
import { useCart } from "@/context/CartContext";
import Button from "../button";
import KalapanaFont from "../KalapanaFont";
export default function AddToCartButton(props) {
  const { addToCart } = useCart();

  const handleAddToCart = () => {
    addToCart({ name: "Iphone 16 pro", price: 16500, id: "1" });
  };
  return (
    <Button
      className={`bg-purple border-b-4 border-b-purple-700 px-2`}
      onClick={handleAddToCart}
      {...props}
    >
      <KalapanaFont>ব্যাগে রাখুন</KalapanaFont>{" "}
    </Button>
  );
}
