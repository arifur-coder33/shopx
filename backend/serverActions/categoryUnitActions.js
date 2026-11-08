"use server";

import prisma from "@/lib/prisma";
import { hasPermission } from "@/backend/utils/hasPermission";

export async function getCategoryUnitOptions(parentId) {
  await hasPermission("category", "view");
  const [units, inherited] = await Promise.all([
    prisma.categoryUnit.findMany({ orderBy: { name: "asc" } }),
    resolveUnit(parentId),
  ]);
  return { units: units.map(({ name }) => name), inherited };
}

async function resolveUnit(id) {
  const seen = new Set();
  while (id && !seen.has(id)) {
    seen.add(id);
    const category = await prisma.category.findUnique({
      where: { id }, select: { unitName: true, parentCategoryId: true },
    });
    if (!category) break;
    if (category.unitName) return category.unitName;
    id = category.parentCategoryId;
  }
  return "pcs";
}

export async function addCategoryUnit(raw, categoryId) {
  try {
    await hasPermission("category", categoryId ? "update" : "create");
    const name = String(raw || "").trim().toLowerCase();
    if (!name || name.length > 32) throw new Error("Enter a unit of 1 to 32 characters.");
    await prisma.categoryUnit.upsert({ where: { name }, update: {}, create: { name } });
    return { name };
  } catch (error) {
    return { error: error.message };
  }
}
