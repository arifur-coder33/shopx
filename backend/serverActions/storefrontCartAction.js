"use server";

import prisma from "@/lib/prisma";
import { isDatabaseId } from "@/lib/databaseId";

// A deliberately small action for quick-add buttons. Keeping it separate from
// the admin product action bundle prevents every storefront page compiling it.
export async function getStorefrontCartItem(slug) {
  try {
    const product = await prisma.product.findUnique({
      where: { slug },
      select: {
        id: true,
        title: true,
        slug: true,
        isActive: true,
        categoryId: true,
        hasVariations: true,
        category: { select: { name: true, slug: true, fullPath: true } },
        thumbnail: { select: { name: true } },
        variations: {
          take: 1,
          select: {
            id: true,
            sku: true,
            weight: true,
            regularPrice: true,
            discountPrice: true,
            thumbnail: { select: { name: true } },
          },
        },
      },
    });

    if (!product?.isActive) {
      return { success: false, error: "Product is unavailable." };
    }
    if (product.hasVariations) {
      return { success: false, requiresSelection: true };
    }

    const variation = product.variations[0];
    if (!variation) {
      return { success: false, error: "Product price is unavailable." };
    }

    return {
      success: true,
      data: {
        id: product.id,
        productId: product.id,
        categoryId: product.categoryId,
        title: product.title,
        slug: product.slug,
        discountPrice: variation.discountPrice || variation.regularPrice,
        regularPrice: variation.regularPrice,
        variation: { id: variation.id, combinations: [] },
        thumbnail:
          variation.thumbnail?.name || product.thumbnail?.name || null,
        weight: variation.weight || 0,
        sku: variation.sku,
        category: product.category || "Uncategorized",
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getStorefrontCategoryIds(productIds = []) {
  const ids = [...new Set((Array.isArray(productIds) ? productIds : [])
    .map(String).filter(isDatabaseId).slice(0, 100))];
  if (!ids.length) return {};
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, isActive: true },
    select: { id: true, categoryId: true },
  });
  return Object.fromEntries(products.map((product) => [product.id, product.categoryId]));
}
