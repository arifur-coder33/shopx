"use client";
import OrderForm from "@/components/checkout/OrderForm";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import BuyNowProductDetails from "./BuyNowProductDetails";
export default function BuyNowCheckout({ data }) {
  const [deliveryArea, setDeliveryArea] = useState("outside-dhaka");
  const searchParams = useSearchParams();
  const initialQty = searchParams.get("qty") || 1;

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
    >
      <BuyNowProductDetails
        data={data}
        initialQty={initialQty}
        deliveryArea={deliveryArea}
      />
    </OrderForm>
  );
}
