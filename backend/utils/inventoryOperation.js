import { createHash } from "node:crypto";

// A retry UUID is not a Store selector. The trusted Store ID is part of the
// deterministic MongoDB _id, whose existing uniqueness serializes retries.
export function inventoryOperationId(storeId, kind, operationId) {
  if (typeof operationId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(operationId)) {
    throw new Error("A valid operation ID is required. Please retry the form submission.");
  }
  return createHash("sha256").update(JSON.stringify([storeId, kind, operationId.toLowerCase()])).digest("hex").slice(0, 24);
}

export function inventoryOperationFingerprint(values) {
  return createHash("sha256").update(JSON.stringify(values)).digest("hex");
}
