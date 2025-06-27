"use client";

import { getMinMax } from "@/utils/getMinMax";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

const ProductVariationSelector = dynamic(() =>
  import("./ProductVariationSelector")
);

const ProductImageGallery = dynamic(() => import("./ProductImageGallery"), {});

const BuyNowSection = dynamic(() =>
  import("./../[slug]/_components/BuyNowSection")
);
const KalapanaFont = dynamic(() => import("@/components/KalapanaFont"));

import { replaceNumbers } from "@/utils/engToBanNumber";
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
    videoUrl, // Make sure to pass videoUrl if available
  } = data;

  const [selectedVariation, setSelectedVariation] = useState(null);

  const onVariationChangeHandler = (variation) => {
    setSelectedVariation(variation);
  };

  // All of your useMemo hooks for price calculation and image arrays belong here.
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

  const displayRegularPrice = useMemo(() => {
    if (variations) {
      if (selectedVariation)
        return `${selectedVariation.regularPrice.toLocaleString()}`;
      if (regularPriceRange.min === 0 && regularPriceRange.max === 0)
        return "Currently Unavailable";
      if (regularPriceRange.min === regularPriceRange.max)
        return `${regularPriceRange.min.toLocaleString()}`;
      return `${regularPriceRange.min.toLocaleString()} - ${regularPriceRange.max.toLocaleString()}`;
    }
    return `$${regularPrice.toLocaleString()}`;
  }, [selectedVariation, variations, regularPrice, regularPriceRange]);

  const displayDiscountPrice = useMemo(() => {
    if (variations) {
      if (selectedVariation)
        return `${selectedVariation.discountPrice.toLocaleString()}`;
      if (discountPriceRange.min === 0 && discountPriceRange.max === 0)
        return "Currently Unavailable";
      if (discountPriceRange.min === discountPriceRange.max)
        return `${discountPriceRange.min.toLocaleString()}`;
      return `${discountPriceRange.min.toLocaleString()} - ${discountPriceRange.max.toLocaleString()}`;
    }
    return `$${discountPrice.toLocaleString()}`;
  }, [selectedVariation, variations, discountPrice, discountPriceRange]);

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
        <BuyNowSection data={data} selectedVariation={selectedVariation} />
      </div>
    </>
  );
}
