export const bundleComponentProductFilter = {
  isActive: true,
  productType: "PHYSICAL",
  stockMode: "OWN_STOCK",
};

export async function validateBundleComposition(tx, productId, rows) {
  if (!Array.isArray(rows) || !rows.length || rows.length > 100) {
    throw new Error("Add at least one component product.");
  }
  const ids = new Set();
  for (const row of rows) {
    if (typeof row?.id !== "string" || !row.id || !Number.isInteger(row.quantity) ||
        row.quantity < 1 || row.quantity > 1000 || ids.has(row.id)) {
      throw new Error("Use a unique component product and a whole quantity between 1 and 1000.");
    }
    ids.add(row.id);
  }
  const count = await tx.product.count({
    where: { ...bundleComponentProductFilter, id: { in: [...ids], not: productId }, variations: { some: {} } },
  });
  if (count !== ids.size) throw new Error("Choose active physical components with their own stock.");
}

export function parseNewBundleComposition(input) {
  try { return JSON.parse(input || "[]"); } catch { throw new Error("Invalid Bundle Items data."); }
}

export async function saveProductBundleComposition(tx, productId, rows) {
  await validateBundleComposition(tx, productId, rows);
  const componentIds = rows.map(({ id }) => id);
  await tx.productBundleItem.deleteMany({ where: { bundleProductId: productId, componentProductId: { notIn: componentIds } } });
  for (const [position, { id, quantity }] of rows.entries()) {
    const key = { bundleProductId: productId, componentProductId: id };
    await tx.productBundleItem.upsert({
      where: { bundleProductId_componentProductId: key },
      create: { ...key, quantity, position },
      update: { quantity, position },
    });
  }
}
