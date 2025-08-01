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
  const [productQty, setProductQty] = useState(Number(initialQty) || 1);
  const { hasVariations, variations, title, weight, id, slug } = data;
  const selectedVariation = data?.variations?.find((v) => v.id === variationId);

  const getDiscountPrice = selectedVariation
    ? selectedVariation?.discountPrice || selectedVariation?.regularPrice
    : !variations?.combinations?.length > 0 &&
      (variations[0]?.discountPrice || variations[0]?.regularPrice);

  const getRegularPrice = selectedVariation
    ? selectedVariation?.regularPrice
    : !variations?.combinations?.length > 0 && variations[0]?.regularPrice;

  const getSku = selectedVariation
    ? selectedVariation?.sku
    : !variations?.combinations?.length > 0 && variations[0]?.sku;

  const productData = {
    title: title,
    discountPrice: getDiscountPrice,
    regularPrice: getRegularPrice,
    variation: selectedVariation
      ? {
          id: selectedVariation?.id,
          combinations: selectedVariation?.combinations,
        }
      : null,

    mainImageUrl: selectedVariation
      ? selectedVariation?.thumbnail?.name
      : data?.thumbnail?.name || data?.mainImage,
    slug: slug,
    id: id,
    quantity: productQty,
    weight: weight,
    sku: getSku,
    productCode: data?.productCode,
  };

  const deliveryCharge =
    deliveryArea === "inside-dhaka" ? data?.insideDhaka : data?.outSideDhaka;
  return (
    <OrderForm
      setDeliveryArea={setDeliveryArea}
      products={[productData]}
      deliveryCharge={deliveryCharge}
      buyNow={true}
      data={productData}
      initialQty={initialQty}
      variationId={variationId}
    >
      <BuyNowProductDetails
        setProductQty={setProductQty}
        productQty={productQty}
        data={productData}
        deliveryArea={deliveryArea}
      />
    </OrderForm>
  );
}
