// /lib/feed/getProductsForFeed.js

import prisma from "@/lib/prisma";
import { requireCurrentStoreId } from "@/backend/services/storeContextService";

export async function getProductsForFeed() {
  const storeId = await requireCurrentStoreId();
  return prisma.product.findMany({
    where: { storeId, isActive: true },
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
