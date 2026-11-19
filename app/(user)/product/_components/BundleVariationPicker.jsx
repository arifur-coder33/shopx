"use client";

import { useCallback, useMemo } from "react";
import ProductVariationSelector from "./ProductVariationSelector";

export default function BundleVariationPicker({ item, index, onSelect }) {
  const variations = useMemo(() => item.options.map((option) => ({
    id: option.id,
    stock: option.available ? 1 : 0,
    combinations: option.combinations?.length ? option.combinations : [{
      variationName: { name: "Variant" },
      variationValue: { value: option.sku || option.label },
    }],
  })), [item.options]);

  const onVariationChange = useCallback((variation) => {
    onSelect(item.id, index, variation?.id || "");
  }, [index, item.id, onSelect]);

  return (
    <section>
      <h3 className="font-semibold">{item.title}{item.quantity > 1 && ` · ${index + 1} নম্বর`}</h3>
      {variations.length > 0 ? (
        <ProductVariationSelector
          sectionId={null}
          variations={variations}
          hasVariations
          onVariationChange={onVariationChange}
        />
      ) : <p className="text-sm text-text-muted">স্টকে নেই</p>}
    </section>
  );
}
