import prisma from "@/lib/prisma";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { normalizeProductVideos } from "@/backend/utils/productVideos";
import { requireCurrentStoreId } from "./storeContextService";

async function queryProduct(storeId, slug, includeStocks = true) {
  try {
    const data = await prisma.product.findUnique({
      where: { storeId_slug: { storeId, slug } },
      include: {
        category: { select: { name: true, slug: true, fullPath: true } },
        thumbnail: { select: { name: true, id: true } },
        gallery: { select: { media: { select: { id: true, name: true } } } },
        videos: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            header: true,
            url: true,
            sortOrder: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        variations: {
          include: {
            ...(includeStocks && {
              stocks: { where: { storeId }, select: { available: true } },
            }),
            thumbnail: { select: { name: true, id: true } },
            combinations: {
              orderBy: { createdAt: "asc" },
              include: {
                variationName: { select: { id: true, name: true } },
                variationValue: { select: { id: true, value: true } },
              },
            },
          },
        },
      },
    });

    if (!data || data.isActive === false) {
      return { success: false, error: "Product could not be found." };
    }

    return {
      success: true,
      data: {
        ...data,
        gallery: data.gallery.map((item) => item.media),
        videos: normalizeProductVideos(data.videos, data.videoUrl),
        variations: data.variations.map((variation) => ({
          ...variation,
          stock: (variation.stocks || []).reduce(
            (sum, row) => sum + Math.max(0, Number(row.available) || 0),
            0,
          ),
        })),
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

const queryStorefrontProductBySlug = cache((storeId, slug) =>
  queryProduct(storeId, slug),
);

// The product page caches stable catalog fields, but reads stock on every
// request so a cached product never advertises an old stock quantity.
const queryProductPage = cache(async (storeId, slug) => {
  const product = await unstable_cache(
    () => queryProduct(storeId, slug, false),
    ["product-page", storeId, slug],
    { revalidate: 60, tags: [`storefront-catalog:${storeId}`] },
  )();
  if (!product.success) return product;

  const variationIds = product.data.variations.map(({ id }) => id);
  const stocks = variationIds.length
    ? await prisma.stock.findMany({
        where: { storeId, variationId: { in: variationIds } },
        select: { variationId: true, available: true },
      })
    : [];
  const stockByVariation = new Map();
  for (const row of stocks) {
    stockByVariation.set(
      row.variationId,
      (stockByVariation.get(row.variationId) || 0) +
        Math.max(0, Number(row.available) || 0),
    );
  }
  return {
    ...product,
    data: {
      ...product.data,
      variations: product.data.variations.map((variation) => ({
        ...variation,
        stock: stockByVariation.get(variation.id) || 0,
      })),
    },
  };
});

export async function getStorefrontProductForPage(slug) {
  const storeId = await requireCurrentStoreId();
  return queryProductPage(storeId, slug);
}

export async function getStorefrontProductBySlug(slug) {
  const storeId = await requireCurrentStoreId();
  return queryStorefrontProductBySlug(storeId, slug);
}

export async function getStorefrontProductSlugs() {
  try {
    const storeId = await requireCurrentStoreId();
    const products = await prisma.product.findMany({
      where: { storeId, isActive: true },
      select: { slug: true },
    });
    return { success: true, data: products.filter((product) => product.slug) };
  } catch (error) {
    return { success: false, data: [], error: error.message };
  }
}
