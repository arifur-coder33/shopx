"use client";
import { useCart } from "@/context/CartContext";
import { trackFacebookEvent } from "@/utils/fbEventTrack";
import Button from "../button";
export default function AddToCartButton(props) {
  const { addToCart } = useCart();
  const { product } = props;

  const handleAddToCart = () => {
    // addToCart({ name: "Iphone 16 pro", price: 16500, id:product?.id });

    addToCart(product);
    trackFacebookEvent("AddToCart", {
      content_type: "product",
      content_id: product.id,
      value: product.discountPrice || product?.regularPrice,
      currency: "BDT",
    });
  };
  return (
    <Button
      className={`bg-emerald-400 border-b-4 border-b-emerald-700 px-2`}
      onClick={handleAddToCart}
      {...props}
    >
      Add to cart
    </Button>
  );
}
