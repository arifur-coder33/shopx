import prisma from "@/lib/prisma";
import { cache } from "react";
import { normalizeProductVideos } from "@/backend/utils/productVideos";

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
          select: {
            id: true,
            sku: true,
            weight: true,
            regularPrice: true,
            discountPrice: true,
            thumbnailId: true,
            stocks: { select: { available: true } },
            thumbnail: { select: { name: true, id: true } },
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

    return {
      success: true,
      data: {
        ...data,
        gallery: data.gallery.map((item) => item.media),
        videos: normalizeProductVideos(data.videos, data.videoUrl),
        variations: data.variations.map((variation) => ({
          ...variation,
          stock: variation.stocks.reduce(
            (sum, row) => sum + Math.max(0, Number(row.available) || 0),
            0,
          ),
        })),
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
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
    const { isActive: _isActive, ...product } = data;
    return { success: true, data: product };
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
