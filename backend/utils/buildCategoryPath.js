import prisma from "@/lib/prisma";

export async function buildCategoryPath(categoryId, storeId, database = prisma) {
  let names = [];
  let currentId = categoryId;

  while (currentId) {
    const cat = await database.category.findUnique({
      where: { id: currentId, storeId },
      select: { name: true, parentCategoryId: true },
    });

    if (!cat) break;

    names.unshift(cat.name);
    currentId = cat.parentCategoryId;
  }

  return names.join(" > ");
}
