"use client";

import KalapanaFont from "@/components/KalapanaFont";
import { replaceNumbers } from "@/utils/engToBanNumber";
import { getMinMax } from "@/utils/getMinMax";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import BuyNowSection from "../[slug]/_components/BuyNowSection";

const ProductVariationSelector = dynamic(() =>
  import("./ProductVariationSelector")
);

const ProductImageGallery = dynamic(() => import("./ProductImageGallery"), {});

export default function ProductClientShell({
  data,
  imageComponent,
  titleComponent,
}) {
  const {
    thumbnail,
    mainImage,
    gallery,
    imageGallery,
    title,
    discountPrice,
    regularPrice,
    variations,
    videoUrl,
  } = data;

  const [selectedVariation, setSelectedVariation] = useState(null);

  const onVariationChangeHandler = (variation) => {
    setSelectedVariation(variation);
  };

  // Memoize price ranges for variations
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

  // **REFACTORED PRICE LOGIC**
  // This single useMemo hook determines the price to show and the strikethrough price.
  const { priceToDisplay, originalPriceToDisplay } = useMemo(() => {
    let price;
    let originalPrice = null; // Default to null (no strikethrough)

    // Case 1: A specific variation is selected
    if (selectedVariation) {
      const hasDiscount =
        typeof selectedVariation.discountPrice === "number" &&
        selectedVariation.discountPrice > 0 &&
        selectedVariation.discountPrice < selectedVariation.regularPrice;

      price = hasDiscount
        ? selectedVariation.discountPrice
        : selectedVariation.regularPrice;
      originalPrice = hasDiscount ? selectedVariation.regularPrice : null;
    }
    // Case 2: Product has variations, but none are selected (show a price range)
    else if (variations?.length > 0) {
      // Check if any variation has a meaningful discount
      const hasRangeDiscount =
        discountPriceRange.min < regularPriceRange.min ||
        discountPriceRange.max < regularPriceRange.max;

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
        // No discount in the range, so just show the regular price range
        price =
          regularPriceRange.min === regularPriceRange.max
            ? `${regularPriceRange.min}`
            : `${regularPriceRange.min} - ${regularPriceRange.max}`;
      }
    }
    // Case 3: Simple product with no variations
    else {
      const hasDiscount =
        typeof discountPrice === "number" &&
        discountPrice > 0 &&
        discountPrice < regularPrice;

      price = hasDiscount ? discountPrice : regularPrice;
      originalPrice = hasDiscount ? regularPrice : null;
    }

    // Format numbers to localized strings for display
    return {
      priceToDisplay:
        typeof price === "number" ? price.toLocaleString() : price,
      originalPriceToDisplay:
        typeof originalPrice === "number"
          ? originalPrice.toLocaleString()
          : originalPrice,
    };
  }, [
    selectedVariation,
    variations,
    regularPrice,
    discountPrice,
    regularPriceRange,
    discountPriceRange,
  ]);

  const variationsImage = useMemo(
    () =>
      variations?.map((variation) => variation?.thumbnail).filter(Boolean) ||
      [],
    [variations]
  );

  return (
    // This Client Component is responsible for rendering its own columns into the parent grid.
    <>
      <div className="col-span-2">
        <ProductImageGallery
          mainImage={thumbnail || mainImage}
          gallery={gallery || imageGallery}
          variationsImage={variationsImage}
          activeImageId={selectedVariation?.thumbnail?.id}
          title={title}
          videoUrl={videoUrl}
        >
          {/* It receives and renders the server-generated image here */}
          {imageComponent}
        </ProductImageGallery>
      </div>

      <div className="md:col-span-2 mt-2 md:col-start-4">
        {/* It receives and renders the server-generated title here */}
        {titleComponent}

        {/* The rest of the interactive content is rendered below the title */}
        <KalapanaFont>
          <p className="text-2xl dark:text-slate-300 mt-4 relative">
            মূল্যঃ{" "}
            <span className="text-4xl md:text-5xl text-purple">
              {replaceNumbers((priceToDisplay || 0).toString())}
            </span>{" "}
            টাকা {/* The <del> tag is now rendered conditionally */}
            {originalPriceToDisplay && (
              <del className="price-del text-xl ml-2">
                {replaceNumbers(originalPriceToDisplay.toString())}
              </del>
            )}
          </p>
        </KalapanaFont>
        <ProductVariationSelector
          onVariationChange={onVariationChangeHandler}
          variations={variations}
        />
        <BuyNowSection data={data} selectedVariation={selectedVariation} />
      </div>
    </>
  );
}
