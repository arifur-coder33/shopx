"use server";

import prisma from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { getProductCardCampaignData } from "@/backend/services/campaignService";
import { getStorefrontActiveCampaigns as getActiveCampaigns } from "@/backend/services/storefrontCampaignService";

const PRODUCT_BATCH_SIZE = 10;

const productSelect = {
  id: true,
  title: true,
  slug: true,
  hasVariations: true,
  thumbnail: { select: { name: true } },
  category: { select: { name: true } },
  categoryId: true,
  variations: {
    select: {
      regularPrice: true,
      discountPrice: true,
    },
  },
};

function storefrontProduct(product, campaigns = []) {
  const variations = product.variations || [];
  const regularPrices = variations
    .map((variation) => Number(variation.regularPrice))
    .filter(Number.isFinite);
  const salePrices = variations
    .map((variation) => Number(variation.discountPrice))
    .filter((price) => Number.isFinite(price) && price > 0);
  const regularPrice = regularPrices.length ? Math.min(...regularPrices) : 0;
  const lowestSalePrice = salePrices.length ? Math.min(...salePrices) : 0;

  const campaignDisplay = getProductCardCampaignData({
    campaigns,
    productId: product.id,
    categoryId: product.categoryId,
    regularPrice,
    discountPrice: lowestSalePrice,
  });
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
    ...campaignDisplay,
    thumbnail: { name: product.thumbnail?.name || null },
    category: product.category?.name || "Uncategorized",
  };
}

const regularProductWhere = {
  isActive: true,
  OR: [
    { isFeatured: false },
    { isFeatured: null },
  ],
};

async function productBatch({ featured, cursor = null, limit, campaigns = [] }) {
  const productsPromise = prisma.product.findMany({
    where: featured ? { isActive: true, isFeatured: true } : regularProductWhere,
    select: productSelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
  });
  const [products, resolvedCampaigns] = await Promise.all([productsPromise, campaigns]);
  const hasMore = products.length > limit;
  const visibleProducts = hasMore ? products.slice(0, limit) : products;

  return {
    products: visibleProducts.map((product) => storefrontProduct(product, resolvedCampaigns)),
    nextCursor: hasMore
      ? visibleProducts[visibleProducts.length - 1]?.id || null
      : null,
  };
}

async function loadHomeStorefrontData() {
  try {
    // Start campaign and product queries together; calculate prices after both finish.
    const campaigns = getActiveCampaigns();
    const [categories, featured, regular] = await Promise.all([
      prisma.category.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          fullPath: true,
          parentCategoryId: true,
          thumbnail: { select: { name: true } },
        },
        orderBy: { name: "asc" },
      }),
      productBatch({ featured: true, limit: PRODUCT_BATCH_SIZE, campaigns }),
      productBatch({ featured: false, limit: PRODUCT_BATCH_SIZE, campaigns }),
    ]);

    return { success: true, categories, featured, regular };
  } catch (error) {
    console.error("Failed to load home storefront:", error);
    return { success: false, error: error.message };
  }
}

async function loadMoreHomeProducts(cursor) {
  try {
    const regular = await productBatch({
      featured: false,
      cursor: cursor || null,
      limit: PRODUCT_BATCH_SIZE,
      campaigns: await getActiveCampaigns(),
    });
    return { success: true, ...regular };
  } catch (error) {
    console.error("Failed to load more home products:", error);
    return { success: false, error: error.message };
  }
}

const readCachedHomeStorefrontData = unstable_cache(
  loadHomeStorefrontData,
  ["home-storefront-data-v1"],
  { revalidate: 60, tags: ["home-storefront", "products", "campaigns", "categories"] },
);

const readCachedMoreHomeProducts = unstable_cache(
  loadMoreHomeProducts,
  ["home-more-products-v1"],
  { revalidate: 60, tags: ["home-storefront", "products", "campaigns", "categories"] },
);

export async function getHomeStorefrontData() {
  return readCachedHomeStorefrontData();
}

export async function getMoreHomeProducts(cursor) {
  return readCachedMoreHomeProducts(cursor || null);
}
