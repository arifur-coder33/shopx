import prisma from "@/lib/prisma";
import { normalizeText } from "@/utils/normalize";

const compact = (value) => value.replace(/\s/g, "");

export async function findSearchProducts(rawQuery, select, take = 10) {
  const normalized = normalizeText(String(rawQuery || ""));
  const joined = compact(normalized);
  if (!joined) return [];

  const terms = [...new Set([
    normalized,
    joined,
    ...(joined.length > 3 ? [joined.slice(0, -1)] : []),
  ])].filter(Boolean);

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      OR: terms.map((term) => ({ searchText: { contains: term } })),
    },
    select,
    take,
  });

  if (products.length >= take || joined.length < 2) return products;

  // Older products may not have the compact title in searchText yet.
  const flexibleTitle = [...joined.slice(0, 64)]
    .join("[^a-z0-9অ-৿]*");
  const matches = await prisma.product.findRaw({
    filter: { isActive: true, title: { $regex: flexibleTitle, $options: "i" } },
    options: { projection: { _id: 1 }, limit: take + products.length },
  });

  const existing = new Set(products.map((product) => product.id));
  const missingIds = matches
    .map((match) => match._id?.$oid)
    .filter((id) => !existing.has(id))
    .slice(0, take - products.length);
  if (!missingIds.length) return products;

  const olderProducts = await prisma.product.findMany({
    where: { id: { in: missingIds }, isActive: true },
    select,
  });
  const byId = new Map(olderProducts.map((product) => [product.id, product]));
  return [...products, ...missingIds.map((id) => byId.get(id)).filter(Boolean)];
}
