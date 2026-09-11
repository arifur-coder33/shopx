// file: app/product/_components/ProductClientShell.js
"use client";

import { useMemo, useState } from "react";
import ProductImageGallery from "./ProductImageGallery";
import ProductInfoClient from "./ProductInfoClient";

export default function ProductClientShell({
  data,
  titleComponent,
  bottomComponent,
  imageProps,
}) {
  const {
    thumbnail,
    mainImage,
    gallery,
    imageGallery,
    title,
    variations,
    videoUrl,
    videos,
  } = data;

  const variationsImage = useMemo(
    () =>
      variations
        ?.map((variation) => {
          if (!variation?.thumbnail) return null;
          const label = (variation.combinations || [])
            .map((item) => item?.variationValue?.value)
            .filter(Boolean)
            .join(" / ");
          return {
            ...variation.thumbnail,
            seoAlt: label ? `${title} - ${label}` : `${title} - ${variation.sku}`,
          };
        })
        .filter(Boolean) ||
      [],
    [title, variations],
  );
  const [activeImageId, setActiveImageId] = useState();
  return (
    <>
      <div className="min-w-0 md:col-span-1">
        <ProductImageGallery
          imageProps={imageProps}
          mainImage={thumbnail || mainImage}
          gallery={gallery || imageGallery}
          variationsImage={variationsImage}
          title={title}
          videoUrl={videoUrl}
          videos={videos}
          activeImageId={activeImageId}
        />
      </div>

      <div className="min-w-0 rounded-2xl bg-surface p-3 sm:p-5 md:col-span-1">
        {titleComponent}
        <ProductInfoClient setActiveImageId={setActiveImageId} data={data} />
        {bottomComponent}
      </div>
    </>
  );
}
