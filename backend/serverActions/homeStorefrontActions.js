"use server";

import prisma from "@/lib/prisma";

const PRODUCT_BATCH_SIZE = 10;

const productSelect = {
  id: true,
  title: true,
  slug: true,
  hasVariations: true,
  thumbnail: { select: { name: true } },
  category: { select: { name: true } },
  variations: {
    select: {
      regularPrice: true,
      discountPrice: true,
    },
  },
};

function storefrontProduct(product) {
  const variations = product.variations || [];
  const regularPrices = variations
    .map((variation) => Number(variation.regularPrice))
    .filter(Number.isFinite);
  const salePrices = variations
    .map((variation) => Number(variation.discountPrice))
    .filter((price) => Number.isFinite(price) && price > 0);
  const regularPrice = regularPrices.length ? Math.min(...regularPrices) : 0;
  const lowestSalePrice = salePrices.length ? Math.min(...salePrices) : 0;

  return {
    id: product.id,
    title: product.title,
    slug: product.slug,
    hasVariations: Boolean(product.hasVariations),
    regularPrice,
    discountPrice:
      lowestSalePrice > 0 && lowestSalePrice < regularPrice
        ? lowestSalePrice
        : 0,
    thumbnail: { name: product.thumbnail?.name || null },
    category: product.category?.name || "Uncategorized",
  };
}

const regularProductWhere = {
  isActive: true,
  OR: [
    { isFeatured: false },
    { isFeatured: null },
    { isFeatured: { isSet: false } },
  ],
};

async function productBatch({ featured, cursor = null, limit }) {
  const products = await prisma.product.findMany({
    where: featured ? { isActive: true, isFeatured: true } : regularProductWhere,
    select: productSelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
  });
  const hasMore = products.length > limit;
  const visibleProducts = hasMore ? products.slice(0, limit) : products;

  return {
    products: visibleProducts.map(storefrontProduct),
    nextCursor: hasMore
      ? visibleProducts[visibleProducts.length - 1]?.id || null
      : null,
  };
}

export async function getHomeStorefrontData() {
  try {
    const [categories, featured, regular] = await Promise.all([
      prisma.category.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          fullPath: true,
          thumbnail: { select: { name: true } },
        },
        orderBy: { name: "asc" },
      }),
      productBatch({ featured: true, limit: PRODUCT_BATCH_SIZE }),
      productBatch({ featured: false, limit: PRODUCT_BATCH_SIZE }),
    ]);

    return { success: true, categories, featured, regular };
  } catch (error) {
    console.error("Failed to load home storefront:", error);
    return { success: false, error: error.message };
  }
}

export async function getMoreHomeProducts(cursor) {
  try {
    const regular = await productBatch({
      featured: false,
      cursor: cursor || null,
      limit: PRODUCT_BATCH_SIZE,
    });
    return { success: true, ...regular };
  } catch (error) {
    console.error("Failed to load more home products:", error);
    return { success: false, error: error.message };
  }
}
