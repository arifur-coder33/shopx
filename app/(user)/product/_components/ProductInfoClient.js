// file: app/product/_components/ProductInfoClient.js
"use client";

import KalapanaFont from "@/components/KalapanaFont";
import { replaceNumbers } from "@/utils/engToBanNumber";
import { getMinMax } from "@/utils/getMinMax";
import { useEffect, useMemo, useState } from "react";

import BuyNowSection from "./BuyNowSection";
import EMISection from "./EMISection";
import ProductVariationSelector from "./ProductVariationSelector"; // Your existing interactive component

export default function ProductInfoClient({
  data,
  children,
  setActiveImageId,
}) {
  const { variations, hasVariations } = data;
  const [selectedVariation, setSelectedVariation] = useState(null);

  // This flag prevents hydration mismatch by ensuring the initial client render
  // is identical to the server-rendered HTML.
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const onVariationChangeHandler = (variation) => {
    setSelectedVariation(variation);
    setActiveImageId(variation?.thumbnailId);
    console.log(selectedVariation);
  };

  // Memoize price ranges for variations on the client
  const regularPriceRange = useMemo(
    () =>
      getMinMax(
        variations?.filter((v) => v.stock > 0).map((v) => v.regularPrice),
      ),
    [variations],
  );
  const discountPriceRange = useMemo(
    () =>
      getMinMax(
        variations?.filter((v) => v.stock > 0).map((v) => v.discountPrice),
      ),
    [variations],
  );

  // This is the interactive price calculation logic, identical to your original component.
  const { priceToDisplay, originalPriceToDisplay } = useMemo(() => {
    let price;
    let originalPrice = null;

    if (selectedVariation) {
      const hasDiscount =
        typeof selectedVariation.discountPrice === "number" &&
        selectedVariation.discountPrice > 0 &&
        selectedVariation.discountPrice < selectedVariation.regularPrice;

      price = hasDiscount
        ? selectedVariation.discountPrice
        : selectedVariation.regularPrice;
      originalPrice = hasDiscount ? selectedVariation.regularPrice : null;
    } else if (
      variations?.length > 0 &&
      variations[0]?.combinations?.length > 0
    ) {
      const hasRangeDiscount =
        discountPriceRange?.min > 0 &&
        (discountPriceRange?.min < regularPriceRange?.min ||
          discountPriceRange?.max < regularPriceRange?.max);

      if (regularPriceRange.min === 0 && regularPriceRange.max === 0) {
        price = "Currently Unavailable";
      } else if (hasRangeDiscount) {
        price =
          discountPriceRange.min === discountPriceRange.max
            ? `${discountPriceRange.min}`
            : `${discountPriceRange.min} - ${discountPriceRange.max}`;
        originalPrice =
          regularPriceRange.min === regularPriceRange.max
            ? `${regularPriceRange.min}`
            : `${regularPriceRange.min} - ${regularPriceRange.max}`;
      } else {
        price =
          regularPriceRange.min === regularPriceRange.max
            ? `${regularPriceRange.min}`
            : `${regularPriceRange.min} - ${regularPriceRange.max}`;
      }
    } else {
      const hasDiscount =
        typeof variations[0]?.discountPrice === "number" &&
        variations[0]?.discountPrice > 0 &&
        variations[0]?.discountPrice < variations[0]?.regularPrice;

      price = hasDiscount
        ? variations[0]?.discountPrice
        : variations[0]?.regularPrice;
      originalPrice = hasDiscount ? variations[0]?.regularPrice : null;
    }

    return {
      priceToDisplay:
        typeof price === "number" ? price.toLocaleString() : price,
      originalPriceToDisplay:
        typeof originalPrice === "number"
          ? originalPrice.toLocaleString()
          : originalPrice,
    };
  }, [selectedVariation, variations, regularPriceRange, discountPriceRange]);

  // If the component hasn't mounted yet, render the static HTML from the server.
  if (!isMounted) {
    return (
      <>
        {children}
        <BuyNowSection data={data} selectedVariation={null} />
      </>
    );
  }

  // After mounting, render the fully interactive UI.
  return (
    <>
      <KalapanaFont>
        <p className="text-2xl dark:text-slate-300 mt-4 relative">
          মূল্যঃ{" "}
          <span className="text-4xl md:text-5xl text-purple">
            {replaceNumbers((priceToDisplay || 0).toString())}
          </span>{" "}
          টাকা
          {originalPriceToDisplay && (
            <del className="price-del text-xl ml-2">
              {replaceNumbers(originalPriceToDisplay.toString())}
            </del>
          )}
        </p>
      </KalapanaFont>

      {/* The interactive variation selector replaces the static one */}

      {hasVariations && variations[0]?.combinations?.length > 0 && (
        <ProductVariationSelector
          onVariationChange={onVariationChangeHandler}
          variations={variations}
          hasVariations={hasVariations}
        />
      )}

      <BuyNowSection data={data} selectedVariation={selectedVariation} />
      <EMISection price={5000} />
    </>
  );
}
