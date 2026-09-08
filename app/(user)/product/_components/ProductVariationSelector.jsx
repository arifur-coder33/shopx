"use client";

import Tooltip from "@/components/common/Tooltip";
import { useEffect, useMemo, useState } from "react";
// A reusable Tooltip component built with Floating UI and Tailwind

// The main selector component
const ProductVariationSelector = ({
  variations,
  hasVariations,
  allowOutOfStockOrder = false,
  onVariationChange,
}) => {
  const [selectedOptions, setSelectedOptions] = useState({});

  // --- LOGIC (No major changes here, just removal of one useEffect) ---

  const options = useMemo(() => {
    const optionMap = new Map();
    variations.forEach((variation) => {
      variation.combinations.forEach((combo) => {
        const { name } = combo.variationName;
        const { value } = combo.variationValue;
        if (!optionMap.has(name)) {
          optionMap.set(name, new Set());
        }
        optionMap.get(name).add(value);
      });
    });
    const result = {};
    for (const [name, valueSet] of optionMap.entries()) {
      result[name] = Array.from(valueSet).sort();
    }
    return result;
  }, [variations]);

  // **REMOVED**: The useEffect that set a default selection has been removed.

  useEffect(() => {
    const allOptionsSelected =
      Object.keys(options).length > 0 &&
      Object.keys(selectedOptions).length === Object.keys(options).length;

    let matchedVariation = null;
    if (allOptionsSelected) {
      matchedVariation = variations.find((variation) => {
        return variation.combinations.every((combo) => {
          return (
            selectedOptions[combo.variationName.name] ===
            combo.variationValue.value
          );
        });
      });

    }

    // Fire the callback to the parent
    onVariationChange && onVariationChange(matchedVariation || null);
  }, [selectedOptions, variations, onVariationChange, options]);

  const handleOptionChange = (optionName, optionValue) => {
    setSelectedOptions((prev) => ({ ...prev, [optionName]: optionValue }));
  };

  // **UPDATED**: This function now also checks the stock of the potential variation
  const checkAvailability = (optionName, optionValue) => {
    const potentialSelection = {
      ...selectedOptions,
      [optionName]: optionValue,
    };
    const allOptionsSelected =
      Object.keys(options).length === Object.keys(potentialSelection).length;

    // Find all variations that could possibly match the current selection path
    const possibleVariations = variations.filter((variation) => {
      return variation.combinations.every((combo) => {
        const selected = potentialSelection[combo.variationName.name];
        return !selected || selected === combo.variationValue.value;
      });
    });

    // If there are no variations that match this path, it's unavailable
    if (possibleVariations.length === 0) return { available: false, stock: 0 };

    // If we have a full selection, we check the specific matched variation's stock
    if (allOptionsSelected) {
      const finalVariation = possibleVariations[0]; // should be only one
      return {
        available: allowOutOfStockOrder || finalVariation.stock > 0,
        stock: finalVariation.stock,
      };
    }

    // If not a full selection, it's available as long as at least one of the possible future paths has stock
    const isAnyPathInStock = allowOutOfStockOrder || possibleVariations.some((v) => v.stock > 0);
    return { available: isAnyPathInStock, stock: -1 }; // Stock is indeterminate
  };

  // --- JSX (Updated with Tooltip and Selected Variant display) ---

  return (
    <div id="product-variation-list" className="space-y-6">
      {/* Variation Options */}
      <div className="space-y-4">
        {Object.entries(options).map(([name, values]) => (
          <div
            key={name}
            className="flex card flex-col  w-fit my-3 p-2  border-2  gap-x-4 gap-y-2 rounded-xl mt-4 shadow-sm "
            role="radiogroup"
          >
            <span className="text-base font-bold whitespace-nowrap border-b-2">
              {name} <span className="text-sm font-medium">সিলেক্ট করুনঃ</span>
            </span>
            <div className="flex flex-wrap flex-row items-center gap-3">
              {values.map((value) => {
                const isSelected = selectedOptions[name] === value;

                // Check if selecting THIS option would lead to an out-of-stock state
                const availability = checkAvailability(name, value);
                const isCombinationPossible = availability.available;

                // An option is disabled if it's not part of any valid, in-stock combination
                const isDisabled = !isCombinationPossible;

                const tooltipContent = isDisabled
                  ? "Variant Stock not available"
                  : "";

                return (
                  <Tooltip key={value} content={tooltipContent}>
                    <label
                      className={`relative flex items-center justify-center rounded-md border py-2 px-3 text-sm font-medium
                                            ${
                                              isDisabled
                                                ? "cursor-not-allowed bg-gray-50 text-gray-400"
                                                : "cursor-pointer bg-white text-gray-900 hover:bg-gray-50"
                                            }
                                            ${
                                              isSelected
                                                ? "ring-2 ring-indigo-500 ring-offset-2"
                                                : "ring-1 ring-inset ring-gray-300"
                                            }
                                            focus:outline-none transition-all duration-150 ease-in-out`}
                    >
                      <input
                        type="radio"
                        name={name}
                        value={value}
                        checked={isSelected}
                        onChange={() => handleOptionChange(name, value)}
                        className="sr-only"
                        disabled={isDisabled}
                      />
                      <span>{value}</span>
                      {/* Visual strikethrough for disabled options */}
                      {isDisabled && (
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute -inset-px rounded-md border-2 border-transparent"
                        >
                          <svg
                            className="absolute inset-0 h-full w-full stroke-2 text-gray-300"
                            viewBox="0 0 100 100"
                            preserveAspectRatio="none"
                            stroke="currentColor"
                          >
                            <line
                              x1="0"
                              y1="100"
                              x2="100"
                              y2="0"
                              vectorEffect="non-scaling-stroke"
                            ></line>
                          </svg>
                        </span>
                      )}
                    </label>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Selected Variant Display */}
      {/* <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-800">
            Selected Variant:{" "}
          </span>
          {selectedVariantText ? (
            <span className="text-indigo-600 font-medium">
              {selectedVariantText}
            </span>
          ) : (
            <span className="text-gray-500">
              Please select an option from each group above.
            </span>
          )}
        </p>
      </div> */}
    </div>
  );
};

export default ProductVariationSelector;
