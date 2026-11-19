"use server";

import prisma from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { hasPermission } from "@/backend/utils/hasPermission";
import { revalidateProductChange } from "@/backend/utils/revalidateCategoryProducts";
import { bundleComponentProductFilter, saveProductBundleComposition } from "@/backend/services/bundleCompositionService";

export async function searchBundleComponents(productId, query) {
  await hasPermission("product", productId ? "update" : "create");
  const text = String(query || "").trim().slice(0, 100);
  if (text.length < 2) return [];
  const products = await prisma.product.findMany({
    where: {
      ...bundleComponentProductFilter, ...(productId && { id: { not: productId } }),
      variations: { some: {} },
      OR: [
        { title: { contains: text, mode: "insensitive" } },
        { productCode: { contains: text, mode: "insensitive" } },
        { variations: { some: { sku: { contains: text, mode: "insensitive" } } } },
      ],
    },
    select: { id: true, title: true, productCode: true },
    orderBy: [{ title: "asc" }, { id: "asc" }],
    take: 20,
  });
  return products;
}

export async function saveBundleComponents(productId, rows) {
  try {
    await hasPermission("product", "update");
    if (typeof productId !== "string" || !productId) throw new Error("Select a bundle product.");
    const product = await prisma.$transaction(async (tx) => {
      const bundle = await tx.product.findUnique({
        where: { id: productId },
        select: { id: true, slug: true, stockMode: true, categoryId: true },
      });
      if (bundle?.stockMode !== "COMPONENT_BASED") throw new Error("Save this product with Component based stock mode first.");
      await saveProductBundleComposition(tx, bundle.id, rows);
      await tx.bundleComponent.deleteMany({ where: { bundleVariation: { productId: bundle.id } } });
      return bundle;
    }, { isolationLevel: "Serializable" });
    revalidateTag("products");
    revalidateTag("home-storefront");
    revalidatePath("/");
    await revalidateProductChange(product);
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
}
