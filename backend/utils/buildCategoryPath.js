export async function buildCategoryPath(categoryId) {
  let names = [];
  let currentId = categoryId;

  while (currentId) {
    const cat = await prisma.category.findUnique({
      where: { id: currentId },
      select: { name: true, parentCategoryId: true },
    });

    if (!cat) break;

    names.push(cat.name);
    currentId = cat.parentCategoryId;
  }

  return names.reverse().join(" ");
}
