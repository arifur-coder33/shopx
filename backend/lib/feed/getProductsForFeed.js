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
  });
}
