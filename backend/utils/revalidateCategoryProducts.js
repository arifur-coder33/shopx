import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const categorySelect = { id: true, slug: true, parentCategoryId: true, sizeChartId: true };

async function invalidateCategoryPaths(categoryIds, initial = []) {
  const categories = new Map(initial.map((category) => [category.id, category]));
  const paths = new Set();
  for (const id of new Set(categoryIds.filter(Boolean))) {
    const chain = [];
    const visited = new Set();
    let current = id;
    while (current && !visited.has(current)) {
      visited.add(current);
      if (!categories.has(current)) {
        categories.set(current, await prisma.category.findUnique({ where: { id: current }, select: categorySelect }));
      }
      const category = categories.get(current);
      if (!category) break;
      chain.unshift(encodeURIComponent(category.slug));
      current = category.parentCategoryId;
    }
    for (let index = 0; index < chain.length; index++) {
      paths.add("/category/" + chain.slice(0, index + 1).join("/"));
      paths.add("/category/" + chain[index]);
    }
  }
  for (const path of paths) revalidatePath(path);
}

export async function revalidateProductChange(product, previous) {
  await invalidateCategoryPaths([product.categoryId, previous?.categoryId]);
  for (const slug of new Set([product.slug, previous?.slug].filter(Boolean))) {
    revalidatePath("/product/" + encodeURIComponent(slug));
    revalidatePath("/buynow/" + encodeURIComponent(slug));
  }
  revalidatePath("/campaign");
  revalidatePath("/campaign/[id]", "page");
}

export async function revalidateSizeChartProducts({ chartId, categoryId }) {
  const categories = await prisma.category.findMany({ select: categorySelect });
  const affected = new Set(categories.filter((category) =>
    categoryId ? category.id === categoryId : category.sizeChartId === chartId,
  ).map((category) => category.id));
  const children = new Map();
  for (const category of categories) {
    if (!children.has(category.parentCategoryId)) children.set(category.parentCategoryId, []);
    children.get(category.parentCategoryId).push(category);
  }
  for (const id of affected) {
    for (const child of children.get(id) || []) {
      if (!child.sizeChartId) affected.add(child.id);
    }
  }
  if (!affected.size) return;
  const products = await prisma.product.findMany({
    where: { categoryId: { in: [...affected] } },
    select: { slug: true },
  });
  for (const { slug } of products) revalidatePath("/product/" + encodeURIComponent(slug));
  await invalidateCategoryPaths([...affected], categories);
}
