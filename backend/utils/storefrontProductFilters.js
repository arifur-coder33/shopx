const positiveNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
};

export function normalizeStorefrontFilters(input = {}) {
  const minPrice = positiveNumber(input.minPrice);
  const maxPrice = positiveNumber(input.maxPrice);
  const rating = Number(input.rating);
  return {
    minPrice,
    maxPrice: maxPrice != null && maxPrice >= (minPrice ?? 0) ? maxPrice : null,
    inStock: input.inStock === true || input.inStock === "1",
    variation: String(input.variation || "").trim().slice(0, 80),
    variationOptions: (Array.isArray(input.variationOptions)
      ? input.variationOptions
      : typeof input.variationOptions === "string"
        ? input.variationOptions.split(",")
        : [])
      .map((option) => {
        if (typeof option === "string") {
          const [variationNameId, variationValueId] = option.split(":");
          return { variationNameId, variationValueId };
        }
        return {
          variationNameId: String(option?.variationNameId || ""),
          variationValueId: String(option?.variationValueId || ""),
        };
      })
      .filter((option) => option.variationNameId && option.variationValueId)
      .slice(0, 40),
    rating: Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null,
  };
}

export function buildStorefrontProductFilter(input = {}) {
  const filters = normalizeStorefrontFilters(input);
  const variationAnd = [];

  if (filters.minPrice != null) {
    variationAnd.push({
      OR: [
        { discountPrice: { gt: 0, gte: filters.minPrice } },
        {
          AND: [
            { OR: [{ discountPrice: null }, { discountPrice: { lte: 0 } }] },
            { regularPrice: { gte: filters.minPrice } },
          ],
        },
      ],
    });
  }
  if (filters.maxPrice != null) {
    variationAnd.push({
      OR: [
        { discountPrice: { gt: 0, lte: filters.maxPrice } },
        {
          AND: [
            { OR: [{ discountPrice: null }, { discountPrice: { lte: 0 } }] },
            { regularPrice: { lte: filters.maxPrice } },
          ],
        },
      ],
    });
  }
  if (filters.inStock) {
    variationAnd.push({ stocks: { some: { available: { gt: 0 } } } });
  }
  if (filters.variation) {
    variationAnd.push({
      combinations: {
        some: {
          OR: [
            { variationName: { name: { contains: filters.variation, mode: "insensitive" } } },
            { variationValue: { value: { contains: filters.variation, mode: "insensitive" } } },
          ],
        },
      },
    });
  }
  const selectedByName = new Map();
  for (const option of filters.variationOptions) {
    const values = selectedByName.get(option.variationNameId) || new Set();
    values.add(option.variationValueId);
    selectedByName.set(option.variationNameId, values);
  }
  for (const [variationNameId, valueIds] of selectedByName) {
    variationAnd.push({
      combinations: {
        some: {
          variationNameId,
          variationValueId: { in: [...valueIds] },
        },
      },
    });
  }

  const productWhere = {};
  if (variationAnd.length) productWhere.variations = { some: { AND: variationAnd } };
  if (filters.rating) {
    productWhere.photoReviews = {
      some: { isPublished: true, rating: { gte: filters.rating } },
    };
  }
  return {
    filters,
    productWhere,
    variationWhere: variationAnd.length ? { AND: variationAnd } : undefined,
  };
}
