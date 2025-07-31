// file: app/product/_components/ProductInfoServer.js

// NO "use client". This is a Server Component.
import KalapanaFont from "@/components/KalapanaFont";
import { replaceNumbers } from "@/utils/engToBanNumber";
import { getMinMax } from "@/utils/getMinMax";

function calculateInitialDisplayPrice(product) {
  const { variations } = product;
  let price;
  let originalPrice = null;

  if (variations[0]?.combinations?.length > 0) {
    const activeVariations = variations.filter((v) => v.stock > 0);
    const regularPriceRange = getMinMax(
      activeVariations.map((v) => v.regularPrice)
    );
    const discountPriceRange = getMinMax(
      activeVariations.map((v) => v.discountPrice)
    );

    const hasRangeDiscount =
      discountPriceRange.min < regularPriceRange.min ||
      discountPriceRange.max < regularPriceRange.max;

    if (regularPriceRange.min === 0 && regularPriceRange.max === 0) {
      price = "Currently Unavailable";
    } else if (hasRangeDiscount) {
      price =
        discountPriceRange.min === discountPriceRange.max
          ? `${discountPriceRange.min}`
          : `${discountPriceRange.min} - ${discountPriceRange.max}`;
      originalPrice =
        regularPriceRange.min === regularPriceRange.max
          ? `${regularPriceRange.min}`
          : `${regularPriceRange.min} - ${regularPriceRange.max}`;
    } else {
      price =
        regularPriceRange.min === regularPriceRange.max
          ? `${regularPriceRange.min}`
          : `${regularPriceRange.min} - ${regularPriceRange.max}`;
    }
  } else {
    const hasDiscount =
      typeof variations[0].discountPrice === "number" &&
      variations[0].discountPrice > 0 &&
      variations[0].discountPrice < variations[0].regularPrice;
    price = hasDiscount ? variations[0].discountPrice : variations[0].regularPrice;
    originalPrice = hasDiscount ? variations[0].regularPrice : null;
  }

  return {
    priceToDisplay: typeof price === "number" ? price.toLocaleString() : price,
    originalPriceToDisplay:
      typeof originalPrice === "number"
        ? originalPrice.toLocaleString()
        : originalPrice,
  };
}

/**
 * Renders a non-interactive, static list of variation options.
 * The client-side component will replace this with an interactive version.
 */
function StaticVariationSelector({ variations }) {
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

  const options = {};
  for (const [name, valueSet] of optionMap.entries()) {
    options[name] = Array.from(valueSet).sort();
  }

  return (
    <div className="space-y-6">
     
      <div className="space-y-4">
        {Object.entries(options).map(([name, values]) => (
          <div
            key={name}
            className="flex flex-wrap items-center gap-x-4 gap-y-2"
          >
            <span className="text-sm font-medium text-gray-900 dark:text-gray-200 whitespace-nowrap">
              {name}:
            </span>
            <div className="flex flex-wrap items-center gap-3">
              {values.map((value) => (
                <div
                  key={value}
                  className="relative flex items-center justify-center rounded-md border py-2 px-3 text-sm font-medium bg-white text-gray-900 ring-1 ring-inset ring-gray-300"
                >
                  <span>{value}</span> 
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-semibold text-gray-800 dark:text-gray-200">
            Selected Variant:{" "}
          </span>
          <span className="text-gray-500">
            Please select an option from each group above.
          </span>
        </p>
      </div>
    </div>
  );
}

export default function ProductInfoServer({ product }) {
  const { priceToDisplay, originalPriceToDisplay } =
    calculateInitialDisplayPrice(product);

  return (
    <>
      <KalapanaFont>
        <p className="text-2xl dark:text-slate-300 mt-4 relative">
          মূল্যঃ{" "}
          <span className="text-4xl md:text-5xl text-purple">
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

      {product.variations?.length > 0 && (
        <StaticVariationSelector variations={product.variations} />
      )}
    </>
  );
}
