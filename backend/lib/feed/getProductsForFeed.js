// /lib/feed/getProductsForFeed.js

import prisma from "@/lib/prisma";

export async function getProductsForFeed() {
  return prisma.product.findMany({
    where: { isActive: true },
    include: {
      category: true,
      thumbnail: true,
      gallery: {
        include: { media: true },
      },
      variations: {
        include: {
          // Inventory is stored per warehouse in Stock.available; there is no
          // denormalized `stock` field on ProductVariation.
          stocks: { select: { available: true } },
          thumbnail: true,
          combinations: {
            include: {
              variationName: true,
              variationValue: true,
            },
          },
        },
      },
    },
  }).then((products) =>
    products.map((product) => ({
      ...product,
      variations: product.variations.map((variation) => ({
        ...variation,
        stock: (variation.stocks || []).reduce(
          (total, row) => total + Math.max(0, Number(row.available) || 0),
          0,
        ),
      })),
    })),
  );
}
