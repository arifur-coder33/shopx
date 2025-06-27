"use client";

import KalapanaFont from "@/components/KalapanaFont";
import { replaceNumbers } from "@/utils/engToBanNumber";
import { getMinMax } from "@/utils/getMinMax";
import { useMemo, useState } from "react";
import BuyNowSection from "../[slug]/_components/BuyNowSection";
import ProductImageGallery from "./ProductImageGallery";
import ProductVariationSelector from "./ProductVariationSelector";

export default function ProductHeader({ children, data }) {
  const {
    thumbnail,
    mainImage,
    gallery,
    imageGallery,
    title,
    discountPrice,
    regularPrice,
    variations,
  } = data;
  console.log("ProductHeader data:", data);
  const [selectedVariation, setSelectedVariation] = useState(null);
  const onVariationChangeHandler = (variation) => {
    // Handle variation change logic here
    setSelectedVariation(variation);
    console.log("Selected variation:", variation);
  };
  const productRegularPrice = selectedVariation
    ? selectedVariation?.price
    : regularPrice;
  const productDiscountPrice = discountPrice || 0;

  const regularPriceRange = useMemo(
    () =>
      getMinMax(
        variations?.filter((v) => v.stock > 0).map((v) => v.regularPrice)
      ),
    [variations]
  );

  const discountPriceRange = useMemo(
    () =>
      getMinMax(
        variations?.filter((v) => v.stock > 0).map((v) => v.discountPrice)
      ),
    [variations]
  );

  // ** 2. CREATE A DYNAMIC PRICE DISPLAY STRING **
  const displayRegularPrice = useMemo(() => {
    if (variations) {
      if (selectedVariation) {
        return `${selectedVariation.regularPrice.toLocaleString()}`;
      }

      if (regularPriceRange.min === 0 && regularPriceRange.max === 0) {
        return "Currently Unavailable";
      }

      if (regularPriceRange.min === regularPriceRange.max) {
        return `${regularPriceRange.min.toLocaleString()}`;
      }

      return `${regularPriceRange.min.toLocaleString()} - ${regularPriceRange.max.toLocaleString()}`;
    }
    return `$${regularPrice.toLocaleString()}`;
  }, [selectedVariation, variations, regularPrice, regularPriceRange]);

  const displayDiscountPrice = useMemo(() => {
    if (variations) {
      if (selectedVariation) {
        return `${selectedVariation.discountPrice.toLocaleString()}`;
      }

      if (discountPriceRange.min === 0 && discountPriceRange.max === 0) {
        return "Currently Unavailable";
      }

      if (discountPriceRange.min === discountPriceRange.max) {
        return `${discountPriceRange.min.toLocaleString()}`;
      }

      return `${discountPriceRange.min.toLocaleString()} - ${discountPriceRange.max.toLocaleString()}`;
    }
    return `$${discountPrice.toLocaleString()}`;
  }, [selectedVariation, variations, discountPrice, discountPriceRange]);

  const variationsImage =
    variations?.length > 0 &&
    variations?.map((variation) => variation?.thumbnail);
  return (
    <>
      <div className="col-span-2 ">
        <ProductImageGallery
          mainImage={thumbnail || mainImage}
          gallery={gallery || imageGallery}
          variationsImage={variationsImage}
          activeImageId={selectedVariation?.thumbnail?.id}
          title={title}
        >
          {children}
        </ProductImageGallery>
      </div>

      <div className="md:col-span-2 mt-2 md:col-start-4 ">
        <h1 className="text-4xl font-bold border-b-2">{title}</h1>

        <KalapanaFont>
          <p className="text-2xl dark:text-slate-300 mt-4 relative">
            মূল্যঃ{" "}
            <span className="text-4xl md:text-5xl text-purple">
              {replaceNumbers((displayDiscountPrice || 0)?.toString())}
            </span>{" "}
            টাকা{" "}
            <del className="price-del text-xl">
              {replaceNumbers((displayRegularPrice || 0)?.toString())}
            </del>
          </p>
        </KalapanaFont>
        <ProductVariationSelector
          onVariationChange={onVariationChangeHandler}
          variations={variations}
        />
        <BuyNowSection data={data} />
      </div>
    </>
  );
}
