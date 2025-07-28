"use client";
import OrderForm from "@/components/checkout/OrderForm";
import { useCart } from "@/context/CartContext";
import { useState } from "react";
import BuyNowProductDetails from "../buynow/[slug]/_components/BuyNowProductDetails";

export default function CheckoutPage() {
  const [deliveryArea, setDeliveryArea] = useState("outside-dhaka");
  const { cartItems } = useCart();
  if (!cartItems || cartItems.length === 0) {
    return <div className="text-center text-red-500">Your cart is empty.</div>;
  }
  return (
    <OrderForm
      setDeliveryArea={setDeliveryArea}
      // deliveryCharge={deliveryCharge}
      buyNow={true}
      products={cartItems}
    >
      <BuyNowProductDetails data={cartItems} deliveryArea={deliveryArea} />
    </OrderForm>
  );
}
