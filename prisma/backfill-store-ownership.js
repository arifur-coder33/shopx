import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DEFAULT_STORE_SLUG = "default";

// Only ownership roots receive a direct storeId. Child records derive ownership
// through their required parent relation and are checked by the application.
const STORE_OWNED_COLLECTIONS = [
  "Category",
  "VariationName",
  "ProductCodeCounter",
  "Media",
  "Product",
  "Order",
  "OrderCounter",
  "Counter",
  "Shipping",
  "PaymentGateway",
  "CourierProvider",
  "SocialTrackingSetting",
  "Payment",
  "Refund",
  "MoneyAccount",
  "CourierPickupPoint",
  "SiteSetting",
  "ContentPage",
  "Notice",
  "banner",
  "HeroSlide",
  "Supplier",
  "PurchaseOrder",
  "Warehouse",
  "GoodsReceipt",
  "Delivery",
  "InventoryTransaction",
  "Stock",
  "ExpenseCategory",
  "Expense",
  "SupplierPayment",
  "MoneyTransaction",
  "Shareholder",
  "JournalEntry",
];

const PROSPECTIVE_UNIQUES = [
  ["Category", "slug"],
  ["VariationName", "name"],
  ["Product", "slug"],
  ["Order", "orderNo"],
  ["OrderCounter", "idNo"],
  ["Counter", "name"],
  ["PaymentGateway", "code"],
  ["CourierProvider", "code"],
  ["ContentPage", "slug"],
  ["PurchaseOrder", "poNo"],
  ["Warehouse", "code"],
  ["GoodsReceipt", "grnNo"],
  ["Delivery", "deliveryNo"],
  ["ExpenseCategory", "name"],
  ["MoneyTransaction", "transactionNo"],
  ["JournalEntry", "entryNo"],
];

const SINGLETON_COLLECTIONS = [
  "ProductCodeCounter",
  "SocialTrackingSetting",
  "SiteSetting",
];

function countFrom(result) {
  return Number(result?.cursor?.firstBatch?.[0]?.count || 0);
}

async function countDocuments(collection, filter = {}) {
  const result = await prisma.$runCommandRaw({
    aggregate: collection,
    pipeline: [{ $match: filter }, { $count: "count" }],
    cursor: {},
  });
  return countFrom(result);
}

async function findDuplicateCount(collection, field) {
  const result = await prisma.$runCommandRaw({
    aggregate: collection,
    pipeline: [
      { $match: { [field]: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: {
            storeId: { $ifNull: ["$storeId", "__DEFAULT_STORE__"] },
            value: `$${field}`,
          },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
      { $count: "count" },
    ],
    cursor: {},
  });
  return countFrom(result);
}

async function findSingletonDuplicateCount(collection) {
  const result = await prisma.$runCommandRaw({
    aggregate: collection,
    pipeline: [
      { $group: { _id: { $ifNull: ["$storeId", "__DEFAULT_STORE__"] }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $count: "count" },
    ],
    cursor: {},
  });
  return countFrom(result);
}

async function preflight() {
  const issues = [];
  for (const collection of SINGLETON_COLLECTIONS) {
    const duplicates = await findSingletonDuplicateCount(collection);
    if (duplicates > 0) {
      issues.push(`${collection} has ${duplicates} Store(s) with duplicate singleton rows.`);
    }
  }
  for (const [collection, field] of PROSPECTIVE_UNIQUES) {
    const duplicates = await findDuplicateCount(collection, field);
    if (duplicates > 0) {
      issues.push(`${collection}.${field} has ${duplicates} duplicate value group(s).`);
    }
  }
  if (issues.length) {
    throw new Error(`Store ownership preflight failed:\n- ${issues.join("\n- ")}`);
  }
}

async function ensureDefaultStore() {
  return prisma.store.upsert({
    where: { slug: DEFAULT_STORE_SLUG },
    update: {},
    create: { name: "Default Store", slug: DEFAULT_STORE_SLUG, status: "ACTIVE" },
    select: { id: true, slug: true },
  });
}

async function migratePickupExternalStoreId() {
  // CourierPickupPoint.storeId historically meant Pathao's external Store ID.
  // Rename only string values; tenant storeId is stored as an ObjectId.
  await prisma.$runCommandRaw({
    update: "CourierPickupPoint",
    updates: [
      {
        q: { storeId: { $type: "string" }, externalStoreId: { $exists: false } },
        u: { $rename: { storeId: "externalStoreId" } },
        multi: true,
      },
    ],
  });
}

async function backfill(defaultStoreId) {
  const ownershipId = { $oid: defaultStoreId };
  const results = [];
  for (const collection of STORE_OWNED_COLLECTIONS) {
    const result = await prisma.$runCommandRaw({
      update: collection,
      updates: [
        {
          q: { storeId: { $exists: false } },
          u: { $set: { storeId: ownershipId } },
          multi: true,
        },
      ],
    });
    results.push({ collection, modified: Number(result?.nModified || 0) });
  }
  return results;
}

async function verify() {
  const counts = [];
  for (const collection of STORE_OWNED_COLLECTIONS) {
    const total = await countDocuments(collection);
    const unowned = await countDocuments(collection, {
      $or: [
        { storeId: { $exists: false } },
        { storeId: null },
      ],
    });
    counts.push({ collection, total, unowned });
  }
  const failures = counts.filter((item) => item.unowned > 0);
  if (failures.length) {
    throw new Error(
      `Store ownership verification failed:\n- ${failures
        .map((item) => `${item.collection}: ${item.unowned}/${item.total} unowned`)
        .join("\n- ")}`,
    );
  }
  return counts;
}

async function main() {
  const verifyOnly = process.argv.includes("--verify-only");
  await preflight();
  const store = verifyOnly
    ? await prisma.store.findUnique({
        where: { slug: DEFAULT_STORE_SLUG },
        select: { id: true, slug: true },
      })
    : await ensureDefaultStore();
  if (!store) throw new Error("Default Store is missing; verification cannot assign ownership.");
  let changes = [];
  if (!verifyOnly) {
    await migratePickupExternalStoreId();
    changes = await backfill(store.id);
  }
  const counts = await verify();
  console.table(changes.length ? changes : counts);
  console.log(`Store ownership ${verifyOnly ? "verification" : "backfill"} complete for ${store.slug}.`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
