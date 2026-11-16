"use server";

import prisma from "@/lib/prisma";

const PAGE_SIZE = 8;

function toCardProduct(product) {
  const variation = product.variations[0];
  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    hasVariations: Boolean(product.hasVariations),
    image: variation?.thumbnail?.name || product.thumbnail?.name || null,
    regularPrice: variation?.regularPrice ?? null,
    discountPrice: variation?.discountPrice ?? null,
  };
}

export async function getSimilarProductsPage(categoryId, excludeProductId, cursor = null) {
  if (typeof categoryId !== "string" || !categoryId || typeof excludeProductId !== "string" || !excludeProductId) {
    return { success: true, products: [], hasMore: false, nextCursor: null };
  }

  try {
    const rows = await prisma.product.findMany({
    where: {
      isActive: true,
      categoryId,
      id: { not: excludeProductId },
    },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1,
    ...(typeof cursor === "string" && cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      title: true,
      slug: true,
      hasVariations: true,
      thumbnail: { select: { name: true } },
      variations: {
        take: 1,
        select: {
          regularPrice: true,
          discountPrice: true,
          thumbnail: { select: { name: true } },
        },
      },
    },
    });

    const page = rows.slice(0, PAGE_SIZE).map(toCardProduct);
    return {
      success: true,
      products: page,
      hasMore: rows.length > PAGE_SIZE,
      nextCursor: page.at(-1)?.id || null,
    };
  } catch {
    return { success: false, products: [], hasMore: false, nextCursor: null };
  }
}
