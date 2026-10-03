// file: app/product/_components/ProductInfoClient.js
"use client";

import { useCallback, useEffect, useState } from "react";

import ProductPrice from "./ProductPrice";
import BuyNowSection from "./BuyNowSection";
import ProductVariationSelector from "./ProductVariationSelector"; // Your existing interactive component

export default function ProductInfoClient({ data, setActiveImageId, initialOptions }) {
  const { variations, hasVariations } = data;
  const [selectedVariation, setSelectedVariation] = useState(null);

  // Keep the route statically generated while still supporting the SEO variant
  // URLs (`?sku=...`). Reading the query after hydration avoids a server request
  // dependency and preserves identical server/client initial markup.
  useEffect(() => {
    const sku = new URLSearchParams(window.location.search).get("sku");
    if (!sku) return;
    const variation = (variations || []).find((item) => item.sku === sku);
    if (variation) {
      setSelectedVariation(variation);
      setActiveImageId(variation?.thumbnail?.id || variation?.thumbnailId);
    }
  }, [setActiveImageId, variations]);

  const onVariationChangeHandler = useCallback(
    (variation) => {
      setSelectedVariation(variation);
      setActiveImageId(variation?.thumbnail?.id || variation?.thumbnailId);
    },
    [setActiveImageId],
  );

  return (
    <>
      <ProductPrice data={data} selectedVariation={selectedVariation} />

      {/* The interactive variation selector replaces the static one */}

      {hasVariations && variations[0]?.combinations?.length > 0 && (
        <ProductVariationSelector
          onVariationChange={onVariationChangeHandler}
          variations={variations}
          hasVariations={hasVariations}
          allowOutOfStockOrder={data.allowOutOfStockOrder}
          initialOptions={initialOptions}
        />
      )}

      <BuyNowSection data={data} selectedVariation={selectedVariation} />
      {/* <EMISection price={5000} /> */}
    </>
  );
}
