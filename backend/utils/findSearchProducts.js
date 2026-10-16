import prisma from "@/lib/prisma";
import { normalizeText } from "@/utils/normalize";

const compact = (value) => value.replace(/\s/g, "");

export async function findSearchProducts(rawQuery, select, take = 10, extraWhere = {}, cursor = null) {
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
      ...extraWhere,
      OR: terms.map((term) => ({ searchText: { contains: term } })),
    },
    select,
    take,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  if (products.length >= take || joined.length < 2 || cursor || Object.keys(extraWhere).length) return products;

  // Older products may not have the compact title in searchText yet.
  // Legacy products may not have compact searchText. Normalize punctuation
  // inside PostgreSQL so queries such as "i-pho-ne" still match "iPhone".
  const matches = await prisma.$queryRaw`
    SELECT "id" FROM "Product"
    WHERE "isActive" = TRUE
      AND regexp_replace(lower(coalesce("title", '')), '[^[:alnum:]অ-৿]', '', 'g')
        LIKE ${`%${joined.slice(0, 64)}%`}
    LIMIT ${take + products.length}
  `;

  const existing = new Set(products.map((product) => product.id));
  const missingIds = matches
    .map((match) => match.id)
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
