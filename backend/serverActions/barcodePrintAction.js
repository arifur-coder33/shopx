"use server";

import prisma from "@/lib/prisma";
import { actionError, requireProcurementPermission } from "@/backend/utils/procurement";

export async function searchBarcodeProducts(query) {
  try {
    await requireProcurementPermission("inventory", "view");
    const search = String(query || "").trim();
    if (search.length < 2) return { success: true, data: [] };

    const variations = await prisma.productVariation.findMany({
      where: {
        productId: { not: null },
        OR: [
          { sku: { contains: search, mode: "insensitive" } },
          { product: { title: { contains: search, mode: "insensitive" } } },
        ],
      },
      take: 30,
      orderBy: [{ product: { title: "asc" } }, { sku: "asc" }],
      select: {
        id: true,
        sku: true,
        product: { select: { title: true } },
      },
    });

    return {
      success: true,
      data: variations.map((variation) => ({
        id: variation.id,
        sku: variation.sku,
        title: variation.product?.title || "Product",
      })),
    };
  } catch (error) {
    return actionError(error, "Could not search products for barcode printing.");
  }
}
