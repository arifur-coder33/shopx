// Prisma IDs are provider-specific. Accept the common string ID formats used
// by the PostgreSQL schema (cuid) and the existing MongoDB schema (ObjectId).
export function isDatabaseId(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 128 && /^[A-Za-z0-9_-]+$/.test(value);
}
