const formatter = new Intl.NumberFormat("en-BD", {
  maximumFractionDigits: 2,
});

function range(values) {
  if (!values.length) return null;
  return { min: Math.min(...values), max: Math.max(...values) };
}

function displayRange(valueRange) {
  if (!valueRange) return "Currently Unavailable";
  const min = formatter.format(valueRange.min);
  const max = formatter.format(valueRange.max);
  return valueRange.min === valueRange.max ? min : `${min} - ${max}`;
}

export default function calculateInitialDisplayPrice(
  variations = [],
  allowOutOfStockOrder = false,
) {
  const pricedVariations = variations.filter((variation) => {
    const regularPrice = Number(variation.regularPrice);
    return Number.isFinite(regularPrice) && regularPrice > 0;
  });
  const inStockVariations = pricedVariations.filter(
    (variation) => Number(variation.stock) > 0,
  );

  // If every variation is out of stock, still show its configured price.
  // Stock availability is communicated by the purchase buttons separately.
  const candidates =
    allowOutOfStockOrder || inStockVariations.length === 0
      ? pricedVariations
      : inStockVariations;
  const effectivePrices = candidates.map((variation) => {
    const regularPrice = Number(variation.regularPrice);
    const discountPrice = Number(variation.discountPrice);
    return discountPrice > 0 && discountPrice < regularPrice
      ? discountPrice
      : regularPrice;
  });
  const hasDiscount = candidates.some((variation) => {
    const regularPrice = Number(variation.regularPrice);
    const discountPrice = Number(variation.discountPrice);
    return discountPrice > 0 && discountPrice < regularPrice;
  });

  return {
    priceToDisplay: displayRange(range(effectivePrices)),
    originalPriceToDisplay: hasDiscount
      ? displayRange(range(candidates.map((item) => Number(item.regularPrice))))
      : null,
  };
}
