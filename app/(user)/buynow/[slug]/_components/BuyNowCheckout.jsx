"use client";
import OrderForm from "@/components/checkout/OrderForm";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import BuyNowProductDetails from "./BuyNowProductDetails";
export default function BuyNowCheckout({ data }) {
  const [deliveryArea, setDeliveryArea] = useState("outside-dhaka");
  const searchParams = useSearchParams();
  const initialQty = searchParams.get("qty") || 1;
  const variationId = searchParams.get("v") || null;

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
  const selectedVariation = data?.variations?.find((v) => v.id === variationId);
  const productData = [
    {
      title: data?.title,
      discountPrice: selectedVariation
        ? selectedVariation?.discountPrice || selectedVariation?.regularPrice
        : data?.discountPrice || data?.regularPrice,
      regularPrice: selectedVariation
        ? selectedVariation?.regularPrice
        : data?.regularPrice,
      variation: selectedVariation
        ? {
            id: selectedVariation?.id,
            combinations: selectedVariation?.combinations,
          }
        : null,

      mainImageUrl: selectedVariation
        ? selectedVariation?.thumbnail?.name
        : data?.thumbnail?.name || data?.mainImage,
      slug: data?.slug,
      id: data?.id,
      quantity: initialQty ? Number(initialQty) : 1,
      weight: selectedVariation ? selectedVariation?.weight : data?.weight,
    },
  ];
  console.log("productData", data);
  const deliveryCharge =
    deliveryArea === "inside-dhaka" ? data?.insideDhaka : data?.outSideDhaka;
  return (
    <OrderForm
      setDeliveryArea={setDeliveryArea}
      products={productData}
      deliveryCharge={deliveryCharge}
      buyNow={true}
      data={data}
      initialQty={initialQty}
      variationId={variationId}
    >
      <BuyNowProductDetails data={productData} deliveryArea={deliveryArea} />
    </OrderForm>
  );
}
