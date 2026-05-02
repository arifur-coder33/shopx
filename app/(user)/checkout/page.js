"use client";
import OrderForm from "@/components/checkout/OrderForm";
import { useCart } from "@/context/CartContext";
import { useState } from "react";
import BuyNowProductDetails from "../buynow/[slug]/_components/BuyNowProductDetails";

export default function CheckoutPage() {
  const [deliveryArea, setDeliveryArea] = useState("outside-dhaka");

  const [totalPrice, setTotalPrice] = useState(0);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [orderWeight, setOrderWeight] = useState(0);
  const { cartItems } = useCart();
  if (!cartItems || cartItems.length === 0) {
    return <div className="text-center text-red-500">Your cart is empty.</div>;
  }
  console.log("cart", cartItems);
  return (
    // <OrderForm
    //   setDeliveryArea={setDeliveryArea}
    //   // deliveryCharge={deliveryCharge}
    //   buyNow={true}
    //   products={cartItems}
    // >
    //   <BuyNowProductDetails data={cartItems} deliveryArea={deliveryArea} />
    // </OrderForm>

    <OrderForm
      setDeliveryArea={setDeliveryArea}
      deliveryArea={deliveryArea}
      products={cartItems}
      deliveryCharge={deliveryCharge}
      buyNow={false}
      data={cartItems}
      totalPrice={totalPrice}
      orderWeight={orderWeight}
    >
      <BuyNowProductDetails
        data={cartItems}
        deliveryArea={deliveryArea}
        setDeliveryCharge={setDeliveryCharge}
        setTotalPrice={setTotalPrice}
        setOrderWeight={setOrderWeight}
      />
    </OrderForm>
  );
}
