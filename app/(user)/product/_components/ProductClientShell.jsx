// file: app/product/_components/ProductClientShell.js
"use client";

import { useMemo } from "react";
// Import the new unified gallery component
import ProductImageGallery from "./ProductImageGallery";
// The server version is still needed to be passed as a prop
import ProductImageGalleryServer from "./ProductImageGalleryServer";
// Your other imports
import ProductInfoClient from "./ProductInfoClient";
import ProductInfoServer from "./ProductInfoServer";

export default function ProductClientShell({
  data,
  imageComponent, // This is the prioritized <Image> from page.js
  titleComponent,
}) {
  const {
    thumbnail,
    mainImage,
    gallery,
    imageGallery,
    title,
    variations,
    videoUrl,
  } = data;

  const variationsImage = useMemo(
    () =>
      variations?.map((variation) => variation?.thumbnail).filter(Boolean) ||
      [],
    [variations]
  );

  return (
    <>
      <div className="col-span-2">
        {/* --- THE NEW, SIMPLIFIED USAGE --- */}
        <ProductImageGallery
          // --- Props for the interactive version ---
          mainImage={thumbnail || mainImage}
          gallery={gallery || imageGallery}
          variationsImage={variationsImage}
          title={title}
          videoUrl={videoUrl}
          // --- Prop for the static server version ---
          staticContent={
            <ProductImageGalleryServer
              mainImage={thumbnail || mainImage}
              gallery={gallery || imageGallery}
              variationsImage={variationsImage}
              title={title}
              videoUrl={videoUrl}
            >
              {imageComponent}
            </ProductImageGalleryServer>
          }
        >
          {/* --- The <Image> component is passed as a direct child --- */}
          {/* This is what React.cloneElement will use, fixing the error. */}
          {imageComponent}
        </ProductImageGallery>
      </div>

      <div className="md:col-span-2 mt-2 md:col-start-4 md:mt-0">
        {titleComponent}
        <ProductInfoClient data={data}>
          <ProductInfoServer product={data} />
        </ProductInfoClient>
      </div>
    </>
  );
}
