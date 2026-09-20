const assert = require("node:assert/strict");
const { PrismaClient } = require("@prisma/client");
const { STORE_PERMISSIONS, STORE_ROLES, seedIdentityFoundation } = require("./seed-identity-foundation.js");

require("dotenv/config");
const databaseName = new URL(process.env.DATABASE_URL || "mongodb://invalid/none").pathname.replace(/^\//, "");
if (databaseName !== "shopzdv") throw new Error("Refusing Store permission seed verification outside shopzdv.");

const prisma = new PrismaClient();
const migratedResources = new Set(["WAREHOUSE", "INVENTORY", "PURCHASE_ORDER", "GOODS_RECEIPT", "SUPPLIER_PAYMENT", "MONEY_ACCOUNT", "MONEY_TRANSACTION", "EXPENSE", "POS", "FINANCIAL_REPORT", "PAYMENT", "REFUND"]);
const seededRoleCodes = STORE_ROLES.map((role) => role.code);

async function snapshot() {
  const stores = await prisma.store.findMany({ select: { id: true } });
  const roles = await prisma.storeRole.findMany({
    where: { storeId: { in: stores.map((store) => store.id) }, code: { in: seededRoleCodes } },
    include: { permissions: { orderBy: [{ resource: "asc" }, { action: "asc" }] } },
    orderBy: [{ storeId: "asc" }, { code: "asc" }],
  });
  return roles.map((role) => ({
    storeId: role.storeId, code: role.code,
    permissions: role.permissions.map(({ resource, action }) => `${resource}:${action}`),
  }));
}

async function main() {
  const defaultStore = await prisma.store.findUnique({ where: { slug: "default" }, select: { id: true } });
  assert(defaultStore, "Seeded default Store is missing.");
  const before = { users: await prisma.user.count(), products: await prisma.product.count(), orders: await prisma.order.count() };
  const beforeRoles = await snapshot();
  await seedIdentityFoundation(prisma);
  const once = await snapshot();
  await seedIdentityFoundation(prisma);
  const twice = await snapshot();
  assert.deepEqual(twice, once, "Identity seed changed Store permissions on its second run.");
  for (const role of once) {
    const expected = new Set(STORE_PERMISSIONS[role.code].map(([resource, action]) => `${resource}:${action}`));
    for (const permission of expected) assert(role.permissions.includes(permission), `${role.code} missing ${permission}`);
    if (role.code === "MANAGER" || role.code === "STAFF") {
      const previous = beforeRoles.find((entry) => entry.storeId === role.storeId && entry.code === role.code);
      const migrated = (entry) => entry?.permissions.filter((permission) => migratedResources.has(permission.split(":")[0])) || [];
      assert.deepEqual(migrated(role), migrated(previous), `${role.code} received new inventory/procurement permissions`);
    }
  }
  assert.deepEqual({ users: await prisma.user.count(), products: await prisma.product.count(), orders: await prisma.order.count() }, before);
  console.log(JSON.stringify({ databaseName, storeRolesChecked: once.length, idempotent: true, legacyUsersProductsOrdersUnchanged: true }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
