const validRecordId = (value) => typeof value === "string" && value.length >= 8 && value.length <= 64;

export function parseSpecificationRows(raw) {
  let rows;
  try { rows = typeof raw === "string" ? JSON.parse(raw) : raw; }
  catch { throw new Error("Specifications are not ready or contain invalid data. Please reload and try again."); }
  if (!Array.isArray(rows) || rows.length > 100) throw new Error("Specifications must contain at most 100 rows.");
  const seen = new Set();
  for (const row of rows) {
    if (!row || !validRecordId(row.specificationId) || seen.has(row.specificationId)) {
      throw new Error("Select each specification only once.");
    }
    seen.add(row.specificationId);
  }
  return rows;
}

export async function categorySpecificationInput(database, raw, categoryId) {
  const rows = parseSpecificationRows(raw);
  const ids = rows.map((row) => row.specificationId);
  const existing = await database.specification.findMany({ where: { id: { in: ids } }, select: { id: true } });
  if (existing.length !== ids.length) throw new Error("A selected specification no longer exists.");
  if (categoryId && await database.productSpecificationValue.count({
    where: { product: { categoryId }, specificationId: { notIn: ids } },
  })) throw new Error("A removed specification is used by products. Clear those product values first.");
  return rows.map((row, sortOrder) => {
    const options = [...new Set((Array.isArray(row.options) ? row.options : []).map((value) => String(value).trim()).filter(Boolean))];
    if (options.length > 100 || options.some((value) => value.length > 200)) throw new Error("Specification options are too long.");
    return { specificationId: row.specificationId, options, sortOrder };
  });
}

// Called within the existing Product transaction: failed validation rolls back
// both the Product and its specifications. Values may be free text or suggestions.
export async function saveProductSpecifications(tx, productId, categoryId, raw) {
  if (raw === undefined) {
    const values = await tx.productSpecificationValue.findMany({ where: { productId } });
    if (!values.length) return;
    raw = values;
  }
  const rows = parseSpecificationRows(raw);
  const assignments = categoryId ? await tx.categorySpecification.findMany({ where: { categoryId } }) : [];
  const allowed = new Map(assignments.map((row) => [row.specificationId, row]));
  const values = rows.map((row) => {
    if (!allowed.has(row.specificationId)) throw new Error("Specification does not belong to the selected category.");
    if (typeof row.value !== "string" || row.value.length > 2000) throw new Error("Specification value is too long.");
    return { productId, specificationId: row.specificationId, value: row.value.trim(), sortOrder: allowed.get(row.specificationId).sortOrder };
  }).filter((row) => row.value);
  await tx.productSpecificationValue.deleteMany({ where: { productId } });
  if (values.length) await tx.productSpecificationValue.createMany({ data: values });
}
