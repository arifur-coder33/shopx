"use server";

import prisma from "@/lib/prisma";
import { readScheduledCampaignData } from "@/backend/services/storefrontScheduleService";
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

function storefrontProduct(product, campaigns = [], review = { reviewCount: 0, reviewRating: 0 }) {
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
    ...review,
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
  const reviewRows = visibleProducts.length
    ? await prisma.photoReview.groupBy({
        by: ["productId"],
        where: { productId: { in: visibleProducts.map((product) => product.id) }, isPublished: true },
        _count: { _all: true },
        _avg: { rating: true },
      })
    : [];
  const reviewsByProductId = new Map(reviewRows.map((row) => [row.productId, {
    reviewCount: row._count._all,
    reviewRating: row._avg.rating || 0,
  }]));

  return {
    products: visibleProducts.map((product) => storefrontProduct(
      product,
      resolvedCampaigns,
      reviewsByProductId.get(product.id),
    )),
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
    throw error;
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
    throw error;
  }
}

export async function getHomeStorefrontData() {
  return readScheduledCampaignData(loadHomeStorefrontData, ["home-storefront-data-v2"], ["home-storefront", "products", "campaigns", "categories"]);
}

export async function getMoreHomeProducts(cursor) {
  try {
    return await readScheduledCampaignData(loadMoreHomeProducts, ["home-more-products-v2"], ["home-storefront", "products", "campaigns", "categories"], [cursor || null]);
  } catch (error) {
    return { success: false, error: error.message };
  }
}
