import prisma from "@/lib/prisma";
import { defaultCategoryDeliveryBenefits } from "@/lib/categoryDeliveryBenefits";
import { unstable_cache } from "next/cache";

export const getCategoryDeliveryBenefits = unstable_cache(async (category) => {
  const slugs = (category?.fullPath || category?.slug || "").split("/").filter(Boolean);
  if (!slugs.length) return defaultCategoryDeliveryBenefits;

  const rows = await prisma.category.findMany({
    where: { slug: { in: slugs } },
    select: { slug: true, exchangeText: true, returnText: true },
  });
  const bySlug = new Map(rows.map((row) => [row.slug, row]));
  const benefits = { ...defaultCategoryDeliveryBenefits };
  for (const slug of slugs) {
    const row = bySlug.get(slug);
    if (row?.exchangeText != null) benefits.exchangeText = row.exchangeText;
    if (row?.returnText != null) benefits.returnText = row.returnText;
  }
  return benefits;
}, ["category-delivery-benefits"], { tags: ["categories"] });
