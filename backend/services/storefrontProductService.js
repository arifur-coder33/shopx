import prisma from "@/lib/prisma";
import { cache } from "react";
import { normalizeProductVideos } from "@/backend/utils/productVideos";
import { availableBundleUnits, availableProductBundleUnits, bundleComponentStockSelect, productBundleItemsSelect, publicBundleOptions } from "@/lib/bundleStock";

export const getStorefrontProductBySlug = cache(async (slug) => {
  try {
    const data = await prisma.product.findUnique({
      where: { slug },
      select: {
        id: true,
        title: true,
        slug: true,
        productCode: true,
        description: true,
        categoryId: true,
        isActive: true,
        hasVariations: true,
        stockMode: true,
        bundleProducts: productBundleItemsSelect,
        allowOutOfStockOrder: true,
        codAvailable: true,
        advancePaymentType: true,
        advancePaymentValueType: true,
        advancePaymentValue: true,
        deliveryMinDays: true,
        deliveryMaxDays: true,
        seoDescription: true,
        seoKeyWord: true,
        videoUrl: true,
        createdAt: true,
        updatedAt: true,
        category: { select: { name: true, slug: true, fullPath: true } },
        specifications: { orderBy: { sortOrder: "asc" }, select: { id: true, value: true, specification: { select: { id: true, name: true, parent: { select: { id: true, name: true } } } } } },
        thumbnail: { select: { name: true, id: true, url: true } },
        gallery: { select: { media: { select: { id: true, name: true, url: true } } } },
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
          select: {
            id: true,
            sku: true,
            weight: true,
            regularPrice: true,
            discountPrice: true,
            thumbnailId: true,
            stocks: { select: { available: true } },
            bundleItems: { select: bundleComponentStockSelect },
            thumbnail: { select: { name: true, id: true, url: true } },
            combinations: {
              orderBy: { createdAt: "asc" },
              select: {
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

    const { bundleProducts, ...publicData } = data;
    const bundleOptions = data.stockMode === "COMPONENT_BASED" ? publicBundleOptions(bundleProducts) : [];
    const productBundleStock = bundleOptions.length ? availableProductBundleUnits(bundleProducts) : null;
    return {
      success: true,
      data: {
        ...publicData,
        bundleOptions,
        gallery: data.gallery.map((item) => item.media),
        videos: normalizeProductVideos(data.videos, data.videoUrl),
        allowOutOfStockOrder: data.stockMode !== "COMPONENT_BASED" && data.allowOutOfStockOrder,
        variations: data.variations.map(({ bundleItems, ...variation }) => ({
          ...variation,
          bundleContents: data.stockMode === "COMPONENT_BASED" ? bundleItems.map(({ quantity, componentVariation }) => ({
            quantity, sku: componentVariation.sku, title: componentVariation.product?.title,
          })) : undefined,
          stock: data.stockMode === "COMPONENT_BASED" ? (productBundleStock ?? availableBundleUnits(bundleItems)) : variation.stocks.reduce(
            (sum, row) => sum + Math.max(0, Number(row.available) || 0),
            0,
          ),
        })),
      },
    };
  } catch (error) {
    // A database outage is not a missing product; do not cache a false 404.
    throw error;
  }
});

export const getStorefrontCheckoutProductBySlug = cache(async (slug) => {
  try {
    const data = await prisma.product.findUnique({
      where: { slug },
      select: {
        id: true,
        title: true,
        slug: true,
        isActive: true,
        categoryId: true,
        codAvailable: true,
        advancePaymentType: true,
        advancePaymentValueType: true,
        advancePaymentValue: true,
        deliveryMinDays: true,
        deliveryMaxDays: true,
        productCode: true,
        hasVariations: true,
        stockMode: true,
        bundleProducts: productBundleItemsSelect,
        thumbnail: { select: { name: true } },
        category: { select: { name: true, slug: true, fullPath: true } },
        variations: {
          select: {
            id: true,
            sku: true,
            weight: true,
            regularPrice: true,
            discountPrice: true,
            thumbnail: { select: { name: true } },
            combinations: {
              orderBy: { createdAt: "asc" },
              select: {
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
    const { isActive: _isActive, bundleProducts, ...product } = data;
    return { success: true, data: { ...product, bundleOptions: data.stockMode === "COMPONENT_BASED" ? publicBundleOptions(bundleProducts) : [] } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

export async function getStorefrontProductSlugs() {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: { slug: true },
    });
    return { success: true, data: products.filter((product) => product.slug) };
  } catch (error) {
    return { success: false, data: [], error: error.message };
  }
}
