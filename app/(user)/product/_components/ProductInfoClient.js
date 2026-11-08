// file: app/product/_components/ProductInfoClient.js
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import ProductPrice from "./ProductPrice";
import BuyNowSection from "./BuyNowSection";
import ProductVariationSelector from "./ProductVariationSelector"; // Your existing interactive component
import { getProductLiveStock } from "@/backend/serverActions/productActions";

export default function ProductInfoClient({ data: staticData, setActiveImageId, initialOptions }) {
  const [stockResult, setStockResult] = useState(null);

  useEffect(() => {
    let active = true;
    setStockResult(null);
    getProductLiveStock(staticData.id)
      .then((result) => {
        if (!result?.success || !Array.isArray(result.variations)) throw new Error("Stock unavailable");
        if (active) setStockResult({ ...result, productId: staticData.id });
      })
      .catch(() => {
        // Stock refresh is silent; checkout still validates current inventory.
      });
    return () => { active = false; };
  }, [staticData.id]);

  const stockReady = stockResult?.productId === staticData.id;
  const data = useMemo(() => {
    const stocks = new Map((stockResult?.variations || []).map((row) => [row.id, row.stock]));
    const variations = (staticData.variations || []).map((variation) => ({
      ...variation,
      stock: stockReady ? stocks.get(variation.id) ?? 0 : variation.stock,
    }));
    return {
      ...staticData,
      variations,
      stock: variations[0]?.stock || 0,
      stockPending: !stockReady,
      allowOutOfStockOrder: stockReady ? stockResult.allowOutOfStockOrder : staticData.allowOutOfStockOrder,
    };
  }, [staticData, stockResult, stockReady]);
  const { variations, hasVariations } = data;
  const [selectedVariationId, setSelectedVariationId] = useState(null);
  const selectedVariation = variations.find((variation) => variation.id === selectedVariationId) || null;
  const inStock = selectedVariation
    ? selectedVariation.stock > 0
    : variations.some((variation) => variation.stock > 0);

  // Keep the route statically generated while still supporting the SEO variant
  // URLs (`?sku=...`). Reading the query after hydration avoids a server request
  // dependency and preserves identical server/client initial markup.
  useEffect(() => {
    const sku = new URLSearchParams(window.location.search).get("sku");
    if (!sku) return;
    const variation = (staticData.variations || []).find((item) => item.sku === sku);
    if (variation) {
      setSelectedVariationId(variation.id);
      setActiveImageId(variation?.thumbnail?.id || variation?.thumbnailId);
    }
  }, [setActiveImageId, staticData.variations]);

  const onVariationChangeHandler = useCallback(
    (variation) => {
      setSelectedVariationId(variation?.id || null);
      setActiveImageId(variation?.thumbnail?.id || variation?.thumbnailId);
    },
    [setActiveImageId],
  );

  return (
    <>
      <ProductPrice data={data} selectedVariation={selectedVariation} />

      <p className={`mt-1 h-4 text-xs ${inStock ? "text-emerald-600" : "text-text-muted"}`} role="status">
        {stockReady ? (inStock ? "স্টক আছে" : data.allowOutOfStockOrder ? null : "স্টক নেই") : null}
      </p>

      {/* The interactive variation selector replaces the static one */}

      {hasVariations && variations[0]?.combinations?.length > 0 && (
        <ProductVariationSelector
          onVariationChange={onVariationChangeHandler}
          variations={variations}
          hasVariations={hasVariations}
          allowOutOfStockOrder={!stockReady || data.allowOutOfStockOrder}
          initialOptions={initialOptions}
          sizeChart={data.sizeChart}
        />
      )}

      <BuyNowSection data={data} selectedVariation={selectedVariation} />
      {/* <EMISection price={5000} /> */}
    </>
  );
}
