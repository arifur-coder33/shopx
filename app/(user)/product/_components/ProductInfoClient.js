// file: app/product/_components/ProductInfoClient.js
"use client";

import KalapanaFont from "@/components/KalapanaFont";
import { replaceNumbers } from "@/utils/engToBanNumber";
import calculateInitialDisplayPrice from "@/utils/calculateInitialDisplayPrice";
import { useCallback, useEffect, useMemo, useState } from "react";

import BuyNowSection from "./BuyNowSection";
import ProductVariationSelector from "./ProductVariationSelector"; // Your existing interactive component

export default function ProductInfoClient({
  data,
  setActiveImageId,
}) {
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

  // This is the interactive price calculation logic, identical to your original component.
  const { priceToDisplay, originalPriceToDisplay } = useMemo(() => {
    if (selectedVariation) {
      return calculateInitialDisplayPrice([selectedVariation], true);
    }
    return calculateInitialDisplayPrice(
      variations,
      data.allowOutOfStockOrder,
    );
  }, [selectedVariation, variations, data.allowOutOfStockOrder]);

  // After mounting, render the fully interactive UI.
  return (
    <>
      <KalapanaFont>
        <p className="relative mt-4 min-h-16 text-2xl leading-tight dark:text-slate-300">
          মূল্যঃ{" "}
          <span className="text-3xl tabular-nums text-purple sm:text-4xl md:text-5xl">
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
          allowOutOfStockOrder={data.allowOutOfStockOrder}
        />
      )}

      <BuyNowSection data={data} selectedVariation={selectedVariation} />
      {/* <EMISection price={5000} /> */}
    </>
  );
}
