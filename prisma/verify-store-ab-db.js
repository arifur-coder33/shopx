const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { PrismaClient } = require("@prisma/client");

require("dotenv/config");

const databaseName = new URL(process.env.DATABASE_URL || "mongodb://invalid/none")
  .pathname.replace(/^\//, "");
if (databaseName !== "shopzdv") {
  throw new Error(`Refusing Store A/B verification outside shopzdv (got ${databaseName}).`);
}

const prisma = new PrismaClient();
const token = randomUUID().replaceAll("-", "");
const slug = `phase65-${token}`;
const platformDomain = "platform.phase65.example.test";
const labels = ["a", "b"];
const models = [
  "storeDomain", "siteSetting", "paymentGateway", "courierProvider",
  "moneyAccount", "category", "media", "product", "variationName",
  "order", "payment", "refund", "warehouse", "stock",
  "inventoryTransaction", "supplier", "purchaseOrder", "goodsReceipt",
  "supplierPayment", "expenseCategory", "expense",
];
const rolledBack = new Error("PHASE65_EXPECTED_ROLLBACK");
const created = {};
const results = { databaseName, models: {}, hostnames: {}, uniqueness: {}, authorization: {} };

async function baseline() {
  const [defaultStore, users, platformMembers, storeMembers, storeCustomers] = await Promise.all([
    prisma.store.findUnique({ where: { slug: "default" }, select: { id: true } }),
    prisma.user.count(), prisma.platformMember.count(),
    prisma.storeMember.count(), prisma.storeCustomer.count(),
  ]);
  assert(defaultStore, "Seeded default Store is missing.");
  return { defaultStoreId: defaultStore.id, users, platformMembers, storeMembers, storeCustomers };
}

function recordData(storeId, code, records) {
  const now = new Date();
  switch (code) {
    case "storeDomain": return { storeId, domain: `${slug}-${records.label}.example.test`, type: "CUSTOM", status: "ACTIVE", isVerified: true, isPrimary: true };
    case "siteSetting": return { storeId, name: `Temporary ${records.label}` };
    case "paymentGateway": return { storeId, name: "Temporary gateway", code: slug, adapterKey: "COD", isActive: false };
    case "courierProvider": return { storeId, name: "Temporary courier", code: slug, adapterKey: "MANUAL", isActive: false };
    case "moneyAccount": return { storeId, name: "Temporary cash", type: "CASH", accountNumber: slug };
    case "category": return { storeId, name: "Temporary category", slug };
    case "media": return { storeId, url: `https://example.test/${slug}.jpg`, name: `${slug}.jpg`, host: "temporary" };
    case "product": return { storeId, title: "Temporary product", slug, categoryId: records.category.id, thumbnailId: records.media.id };
    case "variationName": return { storeId, name: slug, categoryId: records.category.id };
    case "order": return { storeId, orderNo: slug, customerName: "Temporary test", phoneNumber: "00000000000", email: "temporary@example.test", orderPrice: 1, deliveryCharge: 0, deliveryAddress: "Temporary", ttclid: "" };
    case "payment": return { storeId, orderId: records.order.id, gateway: slug, paymentMethod: "CASH", moneyAccountId: records.moneyAccount.id, amount: 1 };
    case "refund": return { storeId, orderId: records.order.id, paymentId: records.payment.id, moneyAccountId: records.moneyAccount.id, amount: 1 };
    case "warehouse": return { storeId, code: slug, name: "Temporary warehouse" };
    case "stock": return { storeId, warehouseId: records.warehouse.id, variationId: records.productVariation.id, quantity: 1, available: 1 };
    case "inventoryTransaction": return { storeId, warehouseId: records.warehouse.id, variationId: records.productVariation.id, type: "IN", quantity: 1, balanceAfter: 1, referenceType: "OPENING" };
    case "supplier": return { storeId, supplierCode: slug, companyName: "Temporary supplier" };
    case "purchaseOrder": return { storeId, poNo: slug, supplierId: records.supplier.id, subtotal: 1, total: 1, dueAmount: 1 };
    case "goodsReceipt": return { storeId, grnNo: slug, purchaseOrderId: records.purchaseOrder.id, warehouseId: records.warehouse.id };
    case "supplierPayment": return { storeId, supplierId: records.supplier.id, purchaseOrderId: records.purchaseOrder.id, moneyAccountId: records.moneyAccount.id, amount: 1, paymentMethod: "CASH", paidAt: now };
    case "expenseCategory": return { storeId, name: slug };
    case "expense": return { storeId, categoryId: records.expenseCategory.id, moneyAccountId: records.moneyAccount.id, amount: 1, expenseDate: now };
    default: throw new Error(`Unknown model ${code}`);
  }
}

async function exercise(tx) {
  const { resolveStoreContext } = await import("../backend/services/storeContextService.js");
  const { hasStorePermission } = await import("../backend/services/identityAuthorization.server.js");
  const stores = [];
  for (const label of labels) {
    const store = await tx.store.create({ data: { name: `Temporary Store ${label.toUpperCase()}`, slug: `${slug}-${label}` } });
    stores.push(store);
    created[label] = { label, store };
  }

  for (const model of models) {
    for (const label of labels) {
      const records = created[label];
      records[model] = await tx[model].create({ data: recordData(records.store.id, model, records) });
      if (model === "product") {
        records.productVariation = await tx.productVariation.create({
          data: { productId: records.product.id, sku: slug, matcherId: slug, regularPrice: 1 },
        });
      }
    }
  }

  for (const model of models) {
    const a = created.a, b = created.b;
    const ownA = await tx[model].findFirst({ where: { id: a[model].id, storeId: a.store.id } });
    const ownB = await tx[model].findFirst({ where: { id: b[model].id, storeId: b.store.id } });
    const crossA = await tx[model].findFirst({ where: { id: b[model].id, storeId: a.store.id } });
    const crossB = await tx[model].findFirst({ where: { id: a[model].id, storeId: b.store.id } });
    assert(ownA && ownB && !crossA && !crossB, `${model}: scoped read failed`);
    const crossUpdate = await tx[model].updateMany({
      where: { id: b[model].id, storeId: a.store.id },
      data: { storeId: a.store.id },
    });
    const crossDelete = await tx[model].deleteMany({
      where: { id: b[model].id, storeId: a.store.id },
    });
    assert.equal(crossUpdate.count, 0, `${model}: cross-Store update succeeded`);
    assert.equal(crossDelete.count, 0, `${model}: cross-Store delete succeeded`);
    results.models[model] = "scoped read/update/delete PASS";
  }

  for (const label of labels) {
    const records = created[label];
    const result = await resolveStoreContext({
      hostname: records.storeDomain.domain,
      mode: "SAAS", platformDomain, database: tx,
    });
    assert.equal(result.store?.id, records.store.id);
    results.hostnames[label] = result.type;
  }
  const unknown = await resolveStoreContext({ hostname: "unknown.phase65.example.test", mode: "SAAS", platformDomain, database: tx });
  const platform = await resolveStoreContext({ hostname: platformDomain, mode: "SAAS", platformDomain, database: tx });
  assert.equal(unknown.type, "INVALID_STORE");
  assert.equal(platform.type, "PLATFORM");
  results.hostnames.unknown = unknown.type;
  results.hostnames.platform = platform.type;

  // Exercise the real Phase 2 authorization service against temporary DB rows.
  // Supplying the already-resolved trusted context avoids changing STANDALONE behavior.
  for (const label of labels) {
    const records = created[label];
    records.storeRole = await tx.storeRole.create({
      data: { storeId: records.store.id, name: "Temporary owner", code: "OWNER" },
    });
    await tx.storeRolePermission.create({
      data: { roleId: records.storeRole.id, resource: "STORE", action: "VIEW" },
    });
    records.storeMember = await tx.storeMember.create({
      data: {
        storeId: records.store.id, name: "Temporary member",
        email: `${slug}-${label}@example.test`,
        normalizedEmail: `${slug}-${label}@example.test`,
        passwordHash: "temporary-non-login-test-value", roleId: records.storeRole.id,
      },
    });
  }
  for (const memberLabel of labels) {
    const member = created[memberLabel];
    for (const contextLabel of labels) {
      const contextStore = created[contextLabel].store;
      const allowed = await hasStorePermission("STORE", "VIEW", {
        database: tx,
        getSession: async () => ({ user: {
          identityType: "STORE_MEMBER", storeMemberId: member.storeMember.id,
          storeId: member.store.id, roleId: member.storeRole.id,
        } }),
        getStoreContext: async () => ({ type: "STORE", store: contextStore }),
      });
      assert.equal(allowed, memberLabel === contextLabel,
        `Store ${memberLabel} member authorization in Store ${contextLabel} context`);
      results.authorization[`${memberLabel}Member_${contextLabel}Context`] = allowed ? "allowed" : "rejected";
    }
  }

  for (const [model, field] of [
    ["product", "slug"], ["category", "slug"], ["variationName", "name"],
    ["order", "orderNo"], ["warehouse", "code"],
  ]) {
    assert.equal(created.a[model][field], created.b[model][field]);
    results.uniqueness[model] = "same value allowed in A and B";
  }

  assert(await tx.productVariation.findFirst({ where: { id: created.a.productVariation.id, product: { storeId: created.a.store.id } } }));
  assert.equal(await tx.productVariation.findFirst({ where: { id: created.b.productVariation.id, product: { storeId: created.a.store.id } } }), null);
  results.models.productVariation = "parent-scoped read PASS";
  const rawCrossReference = await tx.product.create({
    data: {
      storeId: created.a.store.id,
      title: "Temporary cross-Store reference probe",
      slug: `${slug}-cross-reference`,
      categoryId: created.b.category.id,
    },
    include: { category: { select: { storeId: true } } },
  });
  results.rawRelation = {
    prismaAcceptedCrossStoreCategory: rawCrossReference.category?.storeId === created.b.store.id,
    note: "MongoDB does not enforce tenant equality across relations; application create/update validators must reject this input.",
  };
  throw rolledBack;
}

async function verifySameStoreDuplicate(model, valueField, data) {
  let temporaryStoreId;
  const testSlug = `${slug}-unique-${model}`;
  try {
    await prisma.$transaction(async (tx) => {
      const store = await tx.store.create({ data: { name: "Temporary unique check", slug: testSlug } });
      temporaryStoreId = store.id;
      const payload = { storeId: store.id, ...data };
      await tx[model].create({ data: payload });
      await tx[model].create({ data: payload });
    }, { maxWait: 20000, timeout: 30000 });
    throw new Error(`${model}.${valueField} duplicate was incorrectly accepted.`);
  } catch (error) {
    if (error?.code !== "P2002") throw error;
  }
  assert.equal(await prisma.store.count({ where: { id: temporaryStoreId } }), 0);
  assert.equal(await prisma[model].count({ where: { storeId: temporaryStoreId } }), 0);
  results.uniqueness[model] = "same value accepted across Stores; rejected within one Store (P2002)";
}

async function main() {
  const before = await baseline();
  try {
    await prisma.$transaction(exercise, { maxWait: 20000, timeout: 120000 });
    throw new Error("Temporary test transaction committed unexpectedly.");
  } catch (error) {
    if (error !== rolledBack) throw error;
  }
  const after = await baseline();
  assert.deepEqual(after, before, "Seeded default Store or identity counts changed.");
  const ids = labels.map((label) => created[label].store.id);
  assert.equal(await prisma.store.count({ where: { id: { in: ids } } }), 0);
  for (const model of models) {
    assert.equal(await prisma[model].count({ where: { storeId: { in: ids } } }), 0, `${model} cleanup failed`);
  }
  assert.equal(await prisma.productVariation.count({ where: { product: { storeId: { in: ids } } } }), 0);
  assert.equal(await prisma.storeMember.count({ where: { storeId: { in: ids } } }), 0);
  assert.equal(await prisma.storeRole.count({ where: { storeId: { in: ids } } }), 0);
  assert.equal(await prisma.storeRolePermission.count({
    where: { roleId: { in: labels.map((label) => created[label].storeRole.id) } },
  }), 0);
  await verifySameStoreDuplicate("product", "slug", { title: "Temporary product", slug });
  await verifySameStoreDuplicate("category", "slug", { name: "Temporary category", slug });
  await verifySameStoreDuplicate("variationName", "name", { name: slug });
  await verifySameStoreDuplicate("order", "orderNo", {
    orderNo: slug, customerName: "Temporary test", phoneNumber: "00000000000",
    email: "temporary@example.test", orderPrice: 1, deliveryCharge: 0,
    deliveryAddress: "Temporary", ttclid: "",
  });
  await verifySameStoreDuplicate("warehouse", "code", { code: slug, name: "Temporary warehouse" });
  results.cleanup = "transaction rolled back; exact Store IDs and all owned model counts are zero";
  results.identity = "default Store and legacy User/PlatformMember/StoreMember/StoreCustomer counts unchanged";
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
