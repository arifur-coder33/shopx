"use client";
import OrderForm from "@/components/checkout/OrderForm";
import { useState } from "react";
import BuyNowProductDetails from "../../buynow/[slug]/_components/BuyNowProductDetails";

export default function BuyNowCheckout() {
  const [deliveryArea, setDeliveryArea] = useState("outside-dhaka");

  const products = [
    {
      productName: data?.title,
      price: Number(data?.discountPrice),
      quantity: initialQty,
      productColor: data?.color,
      productSize: data?.size,
      productId: data?.id,
    },
  ];

  const deliveryCharge =
    deliveryArea === "inside-dhaka" ? data?.insideDhaka : data?.outSideDhaka;
  return (
    <OrderForm
      setDeliveryArea={setDeliveryArea}
      products={products}
      deliveryCharge={deliveryCharge}
      buyNow={true}
      data={data}
      initialQty={initialQty}
      variationId={variationId}
    >
      <BuyNowProductDetails
        data={data}
        initialQty={initialQty}
        deliveryArea={deliveryArea}
        variationId={variationId}
      />
    </OrderForm>
  );
}
