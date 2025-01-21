"use client";
import { useCart } from "@/context/CartContext";
import Button from "../button";
import KalapanaFont from "../KalapanaFont";
export default function AddToCartButton(props) {
  const { addToCart } = useCart();
  const { product } = props;

  const handleAddToCart = () => {
    // addToCart({ name: "Iphone 16 pro", price: 16500, id:product?.id });
    addToCart(product);
  };
  return (
    <Button
      className={`bg-emerald-400 border-b-4 border-b-emerald-700 px-2`}
      onClick={handleAddToCart}
      {...props}
    >
      <KalapanaFont>ব্যাগে রাখুন</KalapanaFont>{" "}
    </Button>
  );
}
