export function withStoreId(storeId, where = {}) {
  if (!storeId) throw new Error("A trusted Store ID is required.");
  return { ...where, storeId };
}

export function assertOwned(record, storeId, label = "Record") {
  if (!record || record.storeId !== storeId) {
    throw new Error(`${label} was not found for this Store.`);
  }
  return record;
}

export function assertAllOwned(records, storeId, label = "Record") {
  if (records.some((record) => record.storeId !== storeId)) {
    throw new Error(`${label} does not belong to this Store.`);
  }
  return records;
}
