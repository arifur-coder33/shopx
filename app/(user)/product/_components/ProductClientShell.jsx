// file: app/product/_components/ProductClientShell.js
"use client";

import { useEffect, useMemo, useState } from "react";
import ProductImageGallery from "./ProductImageGallery";
import ProductImageGalleryServer from "./ProductImageGalleryServer";
import ProductInfoClient from "./ProductInfoClient";
import ProductInfoServer from "./ProductInfoServer";

export default function ProductClientShell({
  data,
  imageComponent, // This is the prioritized <Image> from page.js
  titleComponent,
}) {
  const [isMounted, setIsMounted] = useState(false);

  // This hook runs only on the client, after the initial render.
  useEffect(() => {
    setIsMounted(true);
  }, []);
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
  const [activeImageId, setActiveImageId] = useState();
  const staticContent = (
    <ProductImageGalleryServer
      mainImage={thumbnail || mainImage}
      gallery={gallery || imageGallery}
      variationsImage={variationsImage}
      title={title}
      videoUrl={videoUrl}
    >
      {imageComponent}
    </ProductImageGalleryServer>
  );
  return (
    <>
      <div className="col-span-2">
        {!isMounted ? (
          staticContent
        ) : (
          <ProductImageGallery
            mainImage={thumbnail || mainImage}
            gallery={gallery || imageGallery}
            variationsImage={variationsImage}
            title={title}
            videoUrl={videoUrl}
            activeImageId={activeImageId}
          >
            {imageComponent}
          </ProductImageGallery>
        )}
      </div>

      <div className="md:col-span-2 mt-2 md:col-start-4 md:mt-0">
        {titleComponent}
        <ProductInfoClient setActiveImageId={setActiveImageId} data={data}>
          <ProductInfoServer product={data} />
        </ProductInfoClient>
      </div>
    </>
  );
}
