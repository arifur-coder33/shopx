"use client";
import OrderForm from "@/components/checkout/OrderForm";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import BuyNowProductDetails from "./BuyNowProductDetails";
export default function BuyNowCheckout({ data, deliveryRates, checkoutProviders, campaignOffers = [] }) {
  const [deliveryArea, setDeliveryArea] = useState("outside-dhaka");
  const searchParams = useSearchParams();
  const initialQty = searchParams.get("qty") || 1;
  const variationId = searchParams.get("v") || null;
  const [productQty, setProductQty] = useState(Number(initialQty) || 1);
  const [totalPrice, setTotalPrice] = useState(0);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [orderWeight, setOrderWeight] = useState(0);
  const { hasVariations, variations, title, id, slug } = data;
  const selectedVariation = data?.variations?.find((v) => v.id === variationId);
  // const initialDeliveryCharge =
  //   deliveryArea === "inside-dhaka" ? data?.insideDhaka : data?.outSideDhaka;
  // const deliveryCharge =
  //   initialDeliveryCharge + (productData.weight > 1 && productData.weight * 20);

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
    variation:
      hasVariations &&
      variations[0]?.combinations?.length > 0 &&
      selectedVariation
        ? {
            id: selectedVariation?.id,
            combinations: selectedVariation?.combinations,
          }
        : {
            id: variations[0]?.id,
            combinations: [],
          },

    thumbnail: selectedVariation
      ? selectedVariation?.thumbnail?.name
      : data?.thumbnail?.name || data?.mainImage,
    slug: slug,
    id: id,
    productId: id,
    categoryId: data?.categoryId,
    quantity: productQty,
    weight: selectedVariation
      ? selectedVariation?.weight
      : variations[0].weight,
    sku: getSku,
    productCode: data?.productCode,
  };

  return (
    <OrderForm
      setDeliveryArea={setDeliveryArea}
      deliveryArea={deliveryArea}
      products={[productData]}
      deliveryCharge={deliveryCharge}
      buyNow={true}
      data={productData}
      initialQty={initialQty}
      variationId={variationId}
      totalPrice={totalPrice}
      orderWeight={orderWeight}
      checkoutProviders={checkoutProviders}
      campaignOffers={campaignOffers}

    >
      <BuyNowProductDetails
        setProductQty={setProductQty}
        productQty={productQty}
        data={productData}
        deliveryArea={deliveryArea}
        setDeliveryCharge={setDeliveryCharge}
        setTotalPrice={setTotalPrice}
        setOrderWeight={setOrderWeight}
        deliveryRates={deliveryRates}
      />
    </OrderForm>
  );
}
