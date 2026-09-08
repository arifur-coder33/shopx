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
  } = data;

  const variationsImage = useMemo(
    () =>
      variations?.map((variation) => variation?.thumbnail).filter(Boolean) ||
      [],
    [variations],
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
          videoUrl={null}
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
