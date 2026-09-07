import prisma from "@/lib/prisma";
import { cache } from "react";

export const getStorefrontProductBySlug = cache(async (slug) => {
  try {
    const data = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: { select: { name: true, slug: true, fullPath: true } },
        thumbnail: { select: { name: true, id: true } },
        gallery: { select: { media: { select: { id: true, name: true } } } },
        variations: {
          include: {
            stocks: { select: { available: true } },
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
