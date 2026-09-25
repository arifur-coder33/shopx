"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { hasPermission } from "../utils/hasPermission";
import { revalidatePath } from "next/cache";

async function requireCatalogRead() {
  const session = await auth();
  const permissions = session?.user?.permissions || [];
  if (!session?.user || !permissions.some((value) => value === "*" || /^(specification|category|product):(view|create|update)$/.test(value))) throw new Error("Unauthorized");
}
const failure = (error) => ({ success: false, message: error.code === "P2002" ? "This specification already exists under this parent." : error.message });

export async function getSpecifications() {
  try {
    await requireCatalogRead();
    return { success: true, data: await prisma.specification.findMany({ orderBy: { name: "asc" }, include: { parent: { select: { id: true, name: true } } } }) };
  } catch (error) { return failure(error); }
}

export async function getCategorySpecifications(categoryId) {
  try {
    await requireCatalogRead();
    if (!/^[a-f\d]{24}$/i.test(categoryId || "")) return { success: true, data: [] };
    return { success: true, data: await prisma.categorySpecification.findMany({ where: { categoryId }, orderBy: { sortOrder: "asc" }, include: { specification: { include: { parent: true } } } }) };
  } catch (error) { return failure(error); }
}

export async function saveSpecification(formData) {
  try {
    const id = String(formData.get("id") || "");
    await hasPermission("specification", id ? "update" : "create");
    const name = String(formData.get("name") || "").trim().replace(/\s+/g, " ");
    const parentId = String(formData.get("parentId") || "") || null;
    if (name.length < 1 || name.length > 100) throw new Error("Enter a specification name (maximum 100 characters).");
    const data = await prisma.$transaction(async (tx) => {
      if (parentId) {
        const parent = await tx.specification.findUnique({ where: { id: parentId } });
        if (!parent || parent.parentId || parentId === id) throw new Error("Select a top-level parent specification.");
      }
      if (id) {
        const existing = await tx.specification.findUnique({ where: { id }, include: { _count: { select: { children: true, categories: true, values: true } } } });
        if (!existing) throw new Error("Specification not found.");
        if (existing.parentId !== parentId && Object.values(existing._count).some(Boolean)) throw new Error("A specification in use cannot be moved to another parent.");
      }
      const record = { name, parentId, key: `${parentId || "root"}:${name.normalize("NFKC").toLowerCase()}` };
      return id ? tx.specification.update({ where: { id }, data: record }) : tx.specification.create({ data: record });
    });
    revalidatePath("/admin/specifications");
    revalidatePath("/product/[slug]", "page");
    return { success: true, data };
  } catch (error) { return failure(error); }
}

// Creates a batch atomically so one duplicate cannot leave half of the batch saved.
export async function saveSpecifications(formData) {
  try {
    await hasPermission("specification", "create");
    const raw = JSON.parse(String(formData.get("specifications") || "[]"));
    if (!Array.isArray(raw) || raw.length < 1 || raw.length > 100) {
      throw new Error("Add between 1 and 100 specifications.");
    }
    const rows = raw.map((row) => {
      const name = String(row?.name || "").trim().replace(/\s+/g, " ");
      const parentId = String(row?.parentId || "") || null;
      if (name.length < 1 || name.length > 100) throw new Error("Each specification needs a valid name.");
      return { name, parentId, key: `${parentId || "root"}:${name.normalize("NFKC").toLowerCase()}` };
    });
    if (new Set(rows.map((row) => row.key)).size !== rows.length) {
      throw new Error("Duplicate specifications are not allowed in the same batch.");
    }
    const created = await prisma.$transaction(async (tx) => {
      const parentIds = [...new Set(rows.map((row) => row.parentId).filter(Boolean))];
      if (parentIds.length) {
        const parents = await tx.specification.findMany({ where: { id: { in: parentIds } }, select: { id: true, parentId: true } });
        if (parents.length !== parentIds.length || parents.some((parent) => parent.parentId)) {
          throw new Error("Select only top-level parent specifications.");
        }
      }
      const result = [];
      for (const row of rows) result.push(await tx.specification.create({ data: row }));
      return result;
    });
    revalidatePath("/admin/specifications");
    revalidatePath("/product/[slug]", "page");
    return { success: true, data: created };
  } catch (error) { return failure(error); }
}

export async function deleteSpecification(id) {
  try {
    await hasPermission("specification", "delete");
    await prisma.$transaction(async (tx) => {
      const record = await tx.specification.findUnique({ where: { id }, include: { _count: { select: { children: true, categories: true, values: true } } } });
      if (!record || Object.values(record._count).some(Boolean)) throw new Error("Only unused specifications without children can be deleted.");
      await tx.specification.delete({ where: { id } });
    });
    revalidatePath("/admin/specifications");
    return { success: true };
  } catch (error) { return failure(error); }
}
