import prisma from "../../lib/prisma.js";

export async function buildCategoryPath(categoryId, database = prisma) {
  const slugs = [];
  const visited = new Set();
  let currentId = categoryId;

  while (currentId) {
    if (visited.has(currentId)) throw new Error("Category parent hierarchy contains a cycle.");
    visited.add(currentId);
    const cat = await database.category.findUnique({
      where: { id: currentId },
      select: { slug: true, parentCategoryId: true },
    });

    if (!cat) throw new Error("Category or parent category was not found.");
    if (!cat.slug || cat.slug.includes("/")) throw new Error("Category slug is invalid.");

    // Slugs are normalized when saved. Keep the exact stored slug so URLs
    // continue to match the category lookup, including older records.
    slugs.unshift(cat.slug);
    currentId = cat.parentCategoryId;
  }

  return slugs.join("/");
}
