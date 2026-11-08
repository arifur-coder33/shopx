import prisma from "@/lib/prisma";

export const sizeVariationFilter = { name: { equals: "Size", mode: "insensitive" } };

export async function getCategorySizeSettings(categoryId, db = prisma) {
  const visited = new Set();
  let supportsSize = false;
  while (categoryId && !visited.has(categoryId)) {
    visited.add(categoryId);
    const category = await db.category.findUnique({
      where: { id: categoryId },
      select: {
        parentCategoryId: true,
        sizeChart: { include: { image: { select: { name: true } } } },
        variations: { where: { variation: sizeVariationFilter }, select: { id: true }, take: 1 },
      },
    });
    if (!category) break;
    if (category.sizeChart) return { supportsSize: true, chart: category.sizeChart };
    supportsSize ||= category.variations.length > 0;
    categoryId = category.parentCategoryId;
  }
  return { supportsSize, chart: null };
}

export async function categorySizeChartInput(data, categoryId) {
  if (!data.sizeChartId) return categoryId ? { disconnect: true } : undefined;
  const selections = JSON.parse(data.variations || "[]");
  const selectedIds = [data.sizeVariationId, ...selections.map((row) => row.variation?.id)].filter(Boolean);
  const localSize = selectedIds.length && await prisma.variationName.findFirst({
    where: { id: { in: selectedIds }, ...sizeVariationFilter },
    select: { id: true },
  });
  if (!localSize && !(await getCategorySizeSettings(data.parentCategory)).supportsSize) {
    throw new Error("Select the Size variation before assigning a size chart.");
  }
  return { connect: { id: data.sizeChartId } };
}
