import { getMinMax } from "@/utils/getMinMax";
export default function calculateInitialDisplayPrice(variations) {
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
    price = hasDiscount
      ? variations[0].discountPrice
      : variations[0].regularPrice;
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
