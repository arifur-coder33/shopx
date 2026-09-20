// Focused development-only verifier for Store-scoped storefront data caches.
// The in-memory incremental cache models Next's cache adapter across requests;
// it does not claim to exercise a deployed cache or CDN.
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { AsyncLocalStorage } = require("node:async_hooks");
const { registerHooks } = require("node:module");
const { fileURLToPath, pathToFileURL } = require("node:url");
const { PrismaClient } = require("@prisma/client");
require("dotenv/config");

const databaseName = new URL(process.env.DATABASE_URL || "mongodb://invalid/none")
  .pathname.replace(/^\//, "");
if (databaseName !== "shopzdv") throw new Error("Refusing to run outside shopzdv.");
process.env.DEPLOYMENT_MODE = "SAAS";
process.env.PLATFORM_DOMAIN = "localhost";
globalThis.AsyncLocalStorage ??= AsyncLocalStorage;

const root = path.resolve(__dirname, "..");
const nextEntries = Object.fromEntries(
  ["next/headers", "next/cache", "next/server", "next/navigation"].map((name) => [
    name, pathToFileURL(require.resolve(name)).href,
  ]),
);
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (nextEntries[specifier]) return { url: nextEntries[specifier], shortCircuit: true };
    if (specifier.startsWith("@/")) {
      const target = path.join(root, specifier.slice(2));
      return { url: pathToFileURL(path.extname(target) ? target : `${target}.js`).href, shortCircuit: true };
    }
    if (specifier.startsWith(".") && context.parentURL?.startsWith(pathToFileURL(root).href) &&
        !context.parentURL.includes("/node_modules/")) {
      const target = new URL(specifier, context.parentURL);
      if (!fs.existsSync(fileURLToPath(target)) && fs.existsSync(`${fileURLToPath(target)}.js`)) {
        return { url: `${target.href}.js`, shortCircuit: true };
      }
    }
    return nextResolve(specifier, context);
  },
});

const { workAsyncStorage } = require("next/dist/server/app-render/work-async-storage.external.js");
const { workUnitAsyncStorage } = require("next/dist/server/app-render/work-unit-async-storage.external.js");
const db = new PrismaClient();
const run = `storefront-cache-${randomUUID().slice(0, 12)}`;
const records = [];
const entries = new Map();
const stats = { hits: 0, misses: 0, writes: 0 };
const incrementalCache = {
  isOnDemandRevalidate: false,
  async generateCacheKey(key) { return key; },
  async get(key) {
    const entry = entries.get(key);
    if (entry) stats.hits++;
    else stats.misses++;
    return entry ? { value: entry.value, isStale: false } : null;
  },
  async set(key, value, options) {
    entries.set(key, { value, tags: options.tags || [] });
    stats.writes++;
  },
  invalidate(tag) {
    for (const [key, entry] of entries) {
      if (entry.tags.includes(tag)) entries.delete(key);
    }
  },
};

async function inRequest(host, callback) {
  const workStore = { page: "/page", route: "/", forceDynamic: true, incrementalCache };
  return workAsyncStorage.run(workStore, () => workUnitAsyncStorage.run(
    { type: "request", url: { pathname: "/", search: "" }, headers: new Headers({ host }) },
    async () => {
      const result = await callback();
      await Promise.all(Object.values(workStore.pendingRevalidates || {}));
      return result;
    },
  ));
}

async function cleanup() {
  for (const record of records.reverse()) {
    const storeId = record.store.id;
    await db.stock.deleteMany({ where: { storeId } });
    await db.productVariation.deleteMany({ where: { productId: record.product?.id } });
    await db.product.deleteMany({ where: { storeId } });
    await db.warehouse.deleteMany({ where: { storeId } });
    await db.category.deleteMany({ where: { storeId } });
    await db.storeDomain.deleteMany({ where: { storeId } });
    await db.store.delete({ where: { id: storeId } });
  }
  assert.equal(await db.store.count({ where: { slug: { startsWith: run } } }), 0);
  assert.equal(await db.storeDomain.count({ where: { domain: { startsWith: run } } }), 0);
  assert.equal(await db.store.count({ where: { slug: "default" } }), 1);
  process.stdout.write("PASS temporary data cleaned; default Store retained\n");
}

async function main() {
  const home = await import("../backend/serverActions/homeStorefrontActions.js");
  const category = await import("../backend/serverActions/catagoryActions.js");
  const product = await import("../backend/services/storefrontProductService.js");
  const appDb = (await import("../lib/prisma.js")).default;
  const { revalidateTag } = require("next/cache");
  assert(await db.store.findUnique({ where: { slug: "default" } }));
  try {
    for (const label of ["a", "b"]) {
      const store = await db.store.create({ data: { name: `${run}-${label}`, slug: `${run}-${label}` } });
      const record = { store, host: `${run}-${label}.localhost` };
      records.push(record);
      await db.storeDomain.create({ data: {
        storeId: store.id, domain: record.host, type: "CUSTOM", status: "ACTIVE",
        isVerified: true, isPrimary: true,
      } });
      record.category = await db.category.create({ data: {
        storeId: store.id, name: `Category ${label}`, slug: run,
      } });
      record.product = await db.product.create({ data: {
        storeId: store.id, categoryId: record.category.id,
        title: `Product ${label}`, slug: run, isActive: true, status: "ACTIVE",
      } });
      record.variation = await db.productVariation.create({ data: {
        productId: record.product.id, sku: `${run}-${label}`, matcherId: `${run}-${label}`,
        regularPrice: label === "a" ? 100 : 900,
      } });
      record.warehouse = await db.warehouse.create({ data: {
        storeId: store.id, name: `Warehouse ${label}`, code: "MAIN", isDefault: true,
      } });
      record.stock = await db.stock.create({ data: {
        storeId: store.id, warehouseId: record.warehouse.id,
        variationId: record.variation.id, quantity: 2, available: 2,
      } });
    }
    const [a, b] = records;
    const read = (record) => inRequest(record.host, async () => ({
      home: await home.getHomeStorefrontData(),
      more: await home.getMoreHomeProducts(null),
      category: await category.getCategoryPageData(run),
      product: await product.getStorefrontProductForPage(run),
    }));
    const firstA = await read(a);
    const firstB = await read(b);
    assert.equal(firstA.home.regular.products[0].title, "Product a");
    assert.equal(firstB.home.regular.products[0].title, "Product b");
    assert.equal(firstA.more.products[0].title, "Product a");
    assert.equal(firstB.more.products[0].title, "Product b");
    assert.equal(firstA.category.category.name, "Category a");
    assert.equal(firstB.category.category.name, "Category b");
    assert.equal(firstA.product.data.title, "Product a");
    assert.equal(firstB.product.data.title, "Product b");
    process.stdout.write("PASS Home/Category/Product identical slugs isolated by hostname Store\n");

    const writes = stats.writes;
    const hits = stats.hits;
    await read(a);
    assert(stats.hits >= hits + 4);
    assert.equal(stats.writes, writes);
    process.stdout.write("PASS repeated Store A requests hit shared incremental cache\n");

    await db.product.update({ where: { id: a.product.id }, data: { title: "Product a updated" } });
    await db.category.update({ where: { id: a.category.id }, data: { name: "Category a updated" } });
    await db.stock.update({ where: { id: a.stock.id }, data: { quantity: 7, available: 7 } });
    const beforeInvalidation = await read(a);
    assert.equal(beforeInvalidation.home.regular.products[0].title, "Product a");
    assert.equal(beforeInvalidation.more.products[0].title, "Product a");
    assert.equal(beforeInvalidation.category.category.name, "Category a");
    assert.equal(beforeInvalidation.product.data.title, "Product a");
    assert.equal(beforeInvalidation.product.data.variations[0].stock, 7);
    process.stdout.write("PASS stable product cached while stock reads fresh DB value\n");

    const invalidatedTags = await inRequest(a.host, () => {
      revalidateTag(`storefront-catalog:${a.store.id}`);
      return workAsyncStorage.getStore().pendingRevalidatedTags;
    });
    assert(invalidatedTags.some(({ tag }) => tag === `storefront-catalog:${a.store.id}`));
    incrementalCache.invalidate(`storefront-catalog:${a.store.id}`);
    const afterInvalidation = await read(a);
    assert.equal(afterInvalidation.home.regular.products[0].title, "Product a updated");
    assert.equal(afterInvalidation.more.products[0].title, "Product a updated");
    assert.equal(afterInvalidation.category.category.name, "Category a updated");
    assert.equal(afterInvalidation.product.data.title, "Product a updated");
    const bHits = stats.hits;
    const stillB = await read(b);
    assert(stats.hits >= bHits + 4);
    assert.equal(stillB.product.data.title, "Product b");
    process.stdout.write("PASS Store A catalog tag invalidates A only; Store B cache retained\n");
  } finally {
    try { await cleanup(); } finally { await Promise.all([db.$disconnect(), appDb.$disconnect()]); }
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
