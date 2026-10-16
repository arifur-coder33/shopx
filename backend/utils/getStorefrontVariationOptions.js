import prisma from "@/lib/prisma";

// Build checkbox facets from options actually used by active product variants.
// Category pages pass their category subtree so unrelated options stay hidden.
export async function getStorefrontVariationOptions(categoryIds = null) {
  const combinations = await prisma.combination.findMany({
    where: {
      variationNameId: { not: null },
      variationValueId: { not: null },
      productVariation: {
        product: {
          isActive: true,
          ...(categoryIds?.length ? { categoryId: { in: categoryIds } } : {}),
        },
      },
    },
    select: {
      variationNameId: true,
      variationValueId: true,
      variationName: { select: { name: true } },
      variationValue: { select: { value: true } },
    },
  });

  const options = new Map();
  for (const row of combinations) {
    if (!row.variationNameId || !row.variationValueId) continue;
    const key = `${row.variationNameId}:${row.variationValueId}`;
    if (options.has(key)) continue;
    options.set(key, {
      key,
      variationNameId: row.variationNameId,
      variationValueId: row.variationValueId,
      name: row.variationName?.name || "Option",
      value: row.variationValue?.value || "",
    });
  }

  return [...options.values()].sort((a, b) =>
    a.name.localeCompare(b.name) || a.value.localeCompare(b.value),
  );
}
