// Phase 26: development-only, DB-backed Store A/B subscription verification.
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { AsyncLocalStorage } = require("node:async_hooks");
const { registerHooks } = require("node:module");
const fs = require("node:fs");
const path = require("node:path");
const { fileURLToPath, pathToFileURL } = require("node:url");
const { PrismaClient } = require("@prisma/client");
require("dotenv/config");

if (new URL(process.env.DATABASE_URL || "mongodb://invalid/none").pathname.slice(1) !== "shopzdv") {
  throw new Error("Refusing SaaS subscription verification outside shopzdv.");
}
process.env.DEPLOYMENT_MODE = "SAAS";
process.env.PLATFORM_DOMAIN = "localhost";
globalThis.AsyncLocalStorage ??= AsyncLocalStorage;

const root = path.resolve(__dirname, "..");
const headersURL = pathToFileURL(require.resolve("next/headers")).href;
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "next/headers") return { url: headersURL, shortCircuit: true };
  if (specifier.startsWith("@/")) {
    const target = path.join(root, specifier.slice(2));
    return { url: pathToFileURL(path.extname(target) ? target : `${target}.js`).href, shortCircuit: true };
  }
  if (specifier.startsWith(".") && context.parentURL?.startsWith(pathToFileURL(root).href) && !context.parentURL.includes("/node_modules/")) {
    const target = new URL(specifier, context.parentURL);
    if (!fs.existsSync(fileURLToPath(target)) && fs.existsSync(`${fileURLToPath(target)}.js`)) return { url: `${target.href}.js`, shortCircuit: true };
  }
  return nextResolve(specifier, context);
} });

const { workAsyncStorage } = require("next/dist/server/app-render/work-async-storage.external.js");
const { workUnitAsyncStorage } = require("next/dist/server/app-render/work-unit-async-storage.external.js");
const db = new PrismaClient();
const run = `phase26-${randomUUID().slice(0, 12)}`;
const created = { stores: [], plans: [] };
const request = (hostname, fn) => workAsyncStorage.run({ route: "/phase26-subscription", incrementalCache: {} }, () =>
  workUnitAsyncStorage.run({ type: "request", headers: new Headers({ host: `${hostname}:3000`, "x-forwarded-proto": "http" }) }, fn));
const pass = (message) => process.stdout.write(`PASS ${message}\n`);

async function makeStore(label) {
  const store = await db.store.create({ data: { name: `${run}-${label}`, slug: `${run}-${label}` } });
  created.stores.push(store);
  const hostname = `${run}-${label}.localhost`;
  await db.storeDomain.create({ data: { storeId: store.id, domain: hostname, type: "CUSTOM", isPrimary: true, isVerified: true, status: "ACTIVE" } });
  return { store, hostname };
}

async function cleanup() {
  for (const store of created.stores) {
    await db.store.update({ where: { id: store.id }, data: { currentSubscriptionId: null } });
    await db.subscription.deleteMany({ where: { storeId: store.id } });
    await db.storeDomain.deleteMany({ where: { storeId: store.id } });
    await db.store.delete({ where: { id: store.id } });
  }
  for (const plan of created.plans) await db.plan.delete({ where: { id: plan.id } });
  assert.equal(await db.store.count({ where: { slug: { startsWith: run } } }), 0);
  assert.equal(await db.subscription.count({ where: { storeId: { in: created.stores.map((store) => store.id) } } }), 0);
  assert.equal(await db.plan.count({ where: { slug: { startsWith: run } } }), 0);
  pass("temporary Stores, domains, subscriptions and plans cleaned");
}

async function main() {
  const service = await import("../backend/services/storeSubscriptionService.js");
  const defaultStore = await db.store.findUnique({ where: { slug: "default" }, select: { id: true } });
  const free = await db.plan.findUnique({ where: { slug: "FREE" } });
  assert(defaultStore?.id && free?.id, "Seeded default Store and FREE plan are required.");
  assert.equal(free.monthlyPriceMinor, null);
  assert.equal(free.yearlyPriceMinor, null);
  try {
    const a = await makeStore("a");
    const b = await makeStore("b");
    const planA = await db.plan.create({ data: { name: `${run} A`, slug: `${run}-a`, features: { advancedReports: true }, limits: { maxProducts: 10 } } });
    created.plans.push(planA);
    const planB = await db.plan.create({ data: { name: `${run} B`, slug: `${run}-b`, features: { advancedReports: false }, limits: { maxProducts: 20 } } });
    created.plans.push(planB);
    await assert.rejects(db.plan.create({ data: { name: "Duplicate", slug: planA.slug, features: {}, limits: {} } }));
    pass("Plan creation and unique slug; FREE seed has no invented price");

    for (const record of [a, b]) {
      assert.equal(await request(record.hostname, () => service.getStoreSubscription()), null);
      assert.equal((await request(record.hostname, () => service.getActiveStorePlan())).slug, "FREE");
      assert.equal(await request(record.hostname, () => service.hasActiveSubscription()), false);
    }
    pass("Store A/B without a subscription safely use FREE without creating billing records");

    const now = new Date();
    const start = new Date(now.getTime() - 86_400_000);
    const end = new Date(now.getTime() + 30 * 86_400_000);
    const aSub = await db.subscription.create({ data: { storeId: a.store.id, planId: planA.id, interval: "MONTHLY", status: "ACTIVE", currentPeriodStart: start, currentPeriodEnd: end } });
    const bSub = await db.subscription.create({ data: { storeId: b.store.id, planId: planB.id, interval: "YEARLY", status: "ACTIVE", currentPeriodStart: start, currentPeriodEnd: end } });
    await db.store.update({ where: { id: a.store.id }, data: { currentSubscriptionId: aSub.id } });
    await db.store.update({ where: { id: b.store.id }, data: { currentSubscriptionId: bSub.id } });
    assert.equal((await request(a.hostname, () => service.getStoreSubscription())).id, aSub.id);
    assert.equal((await request(b.hostname, () => service.getStoreSubscription())).id, bSub.id);
    assert.equal((await request(a.hostname, () => service.getActiveStorePlan())).id, planA.id);
    assert.equal((await request(b.hostname, () => service.getActiveStorePlan())).id, planB.id);
    assert.equal(await request(a.hostname, () => service.getPlanLimit("maxProducts")), 10);
    assert.equal(await request(b.hostname, () => service.getPlanLimit("maxProducts")), 20);
    assert.equal(await request(a.hostname, () => service.canUseFeature("advancedReports")), true);
    assert.equal(await request(b.hostname, () => service.canUseFeature("advancedReports")), false);
    assert.equal(await request(a.hostname, () => service.hasActiveSubscription()), true);
    assert.equal(await request(b.hostname, () => service.hasActiveSubscription()), true);
    pass("A/B trusted-host lookup isolates subscriptions, plan features and limits");

    assert.equal((await request(b.hostname, () => service.getStoreSubscription(a.store.id))).id, bSub.id);
    await db.store.update({ where: { id: b.store.id }, data: { currentSubscriptionId: aSub.id } });
    await assert.rejects(request(b.hostname, () => service.getStoreSubscription()), /does not belong/);
    await db.store.update({ where: { id: b.store.id }, data: { currentSubscriptionId: bSub.id } });
    await assert.rejects(request("unknown.localhost", () => service.getStoreSubscription()), /valid Store context/);
    await assert.rejects(request("localhost", () => service.getStoreSubscription()), /valid Store context/);
    pass("forged Store ID, cross-Store pointer, unknown and platform host rejected");

    await db.subscription.update({ where: { id: aSub.id }, data: { status: "TRIALING", trialStartedAt: start, trialEndsAt: end } });
    assert.equal(await request(a.hostname, () => service.hasActiveSubscription()), true);
    await db.subscription.update({ where: { id: aSub.id }, data: { trialEndsAt: start } });
    assert.equal(await request(a.hostname, () => service.hasActiveSubscription()), false);
    await db.subscription.update({ where: { id: aSub.id }, data: { status: "CANCELLED", cancelledAt: now } });
    assert.equal(await request(a.hostname, () => service.hasActiveSubscription()), true);
    await db.subscription.update({ where: { id: aSub.id }, data: { currentPeriodEnd: start } });
    assert.equal((await request(a.hostname, () => service.getActiveStorePlan())).slug, "FREE");
    for (const status of ["PAST_DUE", "EXPIRED", "SUSPENDED"]) {
      await db.subscription.update({ where: { id: bSub.id }, data: { status } });
      assert.equal(await request(b.hostname, () => service.hasActiveSubscription()), false);
      assert.equal((await request(b.hostname, () => service.getActiveStorePlan())).slug, "FREE");
    }
    pass("trial, cancellation period, expiry, past due and suspension follow safe rules");
    assert.equal((await db.store.findUnique({ where: { id: defaultStore.id } })).id, defaultStore.id);
  } finally {
    await cleanup();
    await db.$disconnect();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
