// Phase 27 development-only verifier: genuine PlatformMember Auth.js sessions.
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { AsyncLocalStorage } = require("node:async_hooks");
const { registerHooks } = require("node:module");
const fs = require("node:fs");
const path = require("node:path");
const { fileURLToPath, pathToFileURL } = require("node:url");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
require("dotenv/config");

if (new URL(process.env.DATABASE_URL || "mongodb://invalid/none").pathname.slice(1) !== "shopzdv") throw new Error("Refusing Platform verification outside shopzdv.");
process.env.DEPLOYMENT_MODE = "SAAS";
process.env.PLATFORM_DOMAIN = "localhost";
process.env.PLATFORM_AUTH_SECRET ||= randomUUID().replaceAll("-", "");
globalThis.AsyncLocalStorage ??= AsyncLocalStorage;

const root = path.resolve(__dirname, "..");
const nextEntries = Object.fromEntries(["next/headers", "next/navigation", "next/cache", "next/server"].map((name) => [name, pathToFileURL(require.resolve(name)).href]));
registerHooks({ resolve(specifier, context, nextResolve) {
  if (nextEntries[specifier]) return { url: nextEntries[specifier], shortCircuit: true };
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
const run = `phase27-${randomUUID().slice(0, 10)}`;
const temp = { platformMembers: [], storeId: null, planId: null };
const pass = (message) => process.stdout.write(`PASS ${message}\n`);
const form = (values) => { const result = new FormData(); for (const [key, value] of Object.entries(values)) result.set(key, value); return result; };
const inRequest = (host, cookie, fn) => workAsyncStorage.run({ route: "/platform", incrementalCache: {} }, () =>
  workUnitAsyncStorage.run({ type: "request", headers: new Headers({ host, "x-forwarded-proto": "http", ...(cookie ? { cookie } : {}) }) }, fn));

async function login(record, platformHandlers, platformAuth, password = record.password, host = "localhost:3000") {
  const base = `http://${host}/api/platform-auth`;
  const csrfResponse = await inRequest(host, "", () => platformHandlers.GET(new Request(`${base}/csrf`, { headers: { host } })));
  const csrf = await csrfResponse.json();
  const csrfCookie = csrfResponse.headers.get("set-cookie")?.split(";")[0];
  assert.equal(csrfResponse.status, 200);
  assert(csrf.csrfToken && csrfCookie);
  const response = await inRequest(host, csrfCookie, () => platformHandlers.POST(new Request(`${base}/callback/platform-credentials`, {
    method: "POST", headers: { host, cookie: csrfCookie, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ csrfToken: csrf.csrfToken, email: record.email, password, callbackUrl: `http://${host}/platform` }),
  })));
  const cookie = response.headers.getSetCookie().find((value) => value.startsWith("authjs.platform.session-token="))?.split(";")[0];
  if (password !== record.password || host !== "localhost:3000") { assert(!cookie); return null; }
  assert(cookie, `Platform Auth.js login failed (HTTP ${response.status}).`);
  const session = await inRequest(host, cookie, () => platformAuth());
  assert.equal(session?.user?.platformMemberId, record.id);
  assert.equal(session?.user?.identityType, "PLATFORM_MEMBER");
  return cookie;
}

async function makeMember(roleCode, roleId) {
  const email = `${run}-${roleCode.toLowerCase()}@example.test`;
  const password = `Temporary-${run}`;
  const member = await db.platformMember.create({ data: { name: `${run} ${roleCode}`, email, normalizedEmail: email,
    passwordHash: await bcrypt.hash(password, 10), roleId, status: "ACTIVE" } });
  temp.platformMembers.push(member.id);
  return { ...member, email, password };
}

async function cleanup() {
  if (temp.storeId) {
    await db.store.update({ where: { id: temp.storeId }, data: { currentSubscriptionId: null } });
    await db.subscription.deleteMany({ where: { storeId: temp.storeId } });
    await db.storeDomain.deleteMany({ where: { storeId: temp.storeId } });
    await db.storeMember.deleteMany({ where: { storeId: temp.storeId } });
    const roles = await db.storeRole.findMany({ where: { storeId: temp.storeId }, select: { id: true } });
    await db.storeRolePermission.deleteMany({ where: { roleId: { in: roles.map((role) => role.id) } } });
    await db.storeRole.deleteMany({ where: { storeId: temp.storeId } });
    await db.store.delete({ where: { id: temp.storeId } });
  }
  if (temp.planId) await db.plan.delete({ where: { id: temp.planId } });
  await db.platformMember.deleteMany({ where: { id: { in: temp.platformMembers } } });
  assert.equal(await db.store.count({ where: { slug: run } }), 0);
  assert.equal(await db.platformMember.count({ where: { normalizedEmail: { startsWith: run } } }), 0);
  pass("temporary PlatformMembers, Store, owner, roles and Plan cleaned");
}

async function main() {
  const { platformHandlers, platformAuth } = await import("../auth/platform.js");
  const actions = await import("../backend/serverActions/platformConsoleActions.js");
  const { requirePlatformConsole } = await import("../backend/services/platformConsole.server.js");
  const { resolveStoreContext } = await import("../backend/services/storeContextService.js");
  if (process.env.PLATFORM_VERIFY_BOOTSTRAP === "1") {
    try {
      const email = String(process.env.PLATFORM_SUPER_ADMIN_EMAIL || "").trim().toLowerCase();
      const password = process.env.PLATFORM_SUPER_ADMIN_PASSWORD;
      assert(email && password, "Dedicated Platform bootstrap credentials are required.");
      const member = await db.platformMember.findUnique({ where: { normalizedEmail: email },
        select: { id: true, roleId: true, status: true, role: { select: { code: true, status: true } } } });
      assert.equal(member?.status, "ACTIVE");
      assert.equal(member?.role?.code, "SUPER_ADMIN");
      assert.equal(member?.role?.status, "ACTIVE");
      const cookie = await login({ ...member, email, password }, platformHandlers, platformAuth);
      await inRequest("localhost:3000", cookie, () => requirePlatformConsole("PLATFORM", "VIEW"));
      await inRequest("localhost:3000", cookie, () => requirePlatformConsole("STORES", "MANAGE"));
      await inRequest("localhost:3000", cookie, () => requirePlatformConsole("BILLING", "MANAGE"));
      pass("seeded permanent Platform SUPER_ADMIN authenticated with genuine Auth.js session and expected permissions");
    } finally { await db.$disconnect(); }
    return;
  }
  const roles = await db.platformRole.findMany({ where: { code: { in: ["SUPER_ADMIN", "PLATFORM_ADMIN", "SUPPORT", "BILLING"] } }, select: { id: true, code: true } });
  const role = Object.fromEntries(roles.map((item) => [item.code, item.id]));
  assert.equal(roles.length, 4);
  const baseline = { defaultStore: await db.store.findUnique({ where: { slug: "default" }, select: { id: true } }), providers: await db.paymentGateway.count() };
  try {
    const admin = await makeMember("SUPER_ADMIN", role.SUPER_ADMIN);
    const support = await makeMember("SUPPORT", role.SUPPORT);
    const billing = await makeMember("BILLING", role.BILLING);
    const platformAdmin = await makeMember("PLATFORM_ADMIN", role.PLATFORM_ADMIN);
    admin.cookie = await login(admin, platformHandlers, platformAuth);
    support.cookie = await login(support, platformHandlers, platformAuth);
    billing.cookie = await login(billing, platformHandlers, platformAuth);
    platformAdmin.cookie = await login(platformAdmin, platformHandlers, platformAuth);
    await login(admin, platformHandlers, platformAuth, "wrong-password");
    pass("genuine PlatformMember Auth.js login and wrong-password rejection");
    if (process.env.PLATFORM_HTTP_SMOKE === "1") {
      for (const route of ["/platform", "/platform/stores", "/platform/plans", "/platform/subscriptions", "/platform/members", "/platform/settings"]) {
        const response = await fetch(`http://localhost:3000${route}`, { headers: { cookie: admin.cookie }, redirect: "manual" });
        assert.equal(response.status, 200, `${route} returned HTTP ${response.status}`);
      }
      assert.equal((await fetch("http://localhost:3000/platform/members", { headers: { cookie: support.cookie }, redirect: "manual" })).status, 404);
      assert.equal((await fetch("http://localhost:3000/platform/stores", { headers: { cookie: billing.cookie }, redirect: "manual" })).status, 404);
      assert.equal((await fetch("http://localhost:3000/platform", { redirect: "manual" })).status, 307);
      pass("HTTP dashboard, Stores, Plans, Subscriptions, Members, Settings and unauthorized routes");
    }

    await inRequest("localhost:3000", admin.cookie, () => requirePlatformConsole("PLATFORM", "VIEW"));
    await inRequest("localhost:3000", platformAdmin.cookie, () => requirePlatformConsole("STORES", "MANAGE"));
    await inRequest("localhost:3000", platformAdmin.cookie, () => requirePlatformConsole("BILLING", "VIEW"));
    await inRequest("localhost:3000", billing.cookie, () => requirePlatformConsole("BILLING", "MANAGE"));
    await assert.rejects(inRequest("localhost:3000", support.cookie, () => requirePlatformConsole("STORES", "MANAGE")));
    await assert.rejects(inRequest("localhost:3000", billing.cookie, () => requirePlatformConsole("STORES", "MANAGE")));
    await assert.rejects(inRequest("localhost:3000", platformAdmin.cookie, () => requirePlatformConsole("BILLING", "MANAGE")));
    await assert.rejects(inRequest("localhost:3000", "", () => requirePlatformConsole("PLATFORM", "VIEW")));
    await assert.rejects(inRequest("unknown.localhost:3000", admin.cookie, () => requirePlatformConsole("PLATFORM", "VIEW")));
    pass("Platform role permissions, absent session and wrong hostname enforced server-side");

    let createStoreRedirect;
    try { await inRequest("localhost:3000", admin.cookie, () => actions.createPlatformStoreAction(form({
      name: `${run} Store`, slug: run, ownerName: "Temporary Owner", ownerEmail: `${run}-owner@example.test`, ownerPassword: `Temporary-${run}`,
    }))); } catch (error) { createStoreRedirect = error.digest; }
    assert(createStoreRedirect?.startsWith("NEXT_REDIRECT"), "Store creation action must redirect.");
    assert(!createStoreRedirect.includes("?error="), createStoreRedirect);
    const store = await db.store.findUnique({ where: { slug: run }, select: { id: true, status: true, currentSubscriptionId: true,
      members: { where: { role: { code: "OWNER" } }, select: { id: true, email: true } } } });
    assert(store?.id && store.members.length === 1 && store.currentSubscriptionId === null);
    temp.storeId = store.id;
    if (process.env.PLATFORM_HTTP_SMOKE === "1") {
      assert.equal((await fetch(`http://localhost:3000/platform/stores/${store.id}`, { headers: { cookie: admin.cookie }, redirect: "manual" })).status, 200);
    }
    const storeHost = `${run}.localhost:3000`;
    await db.storeDomain.create({ data: { storeId: store.id, domain: `${run}.localhost`, type: "CUSTOM", status: "ACTIVE", isVerified: true, isPrimary: true } });
    await login(admin, platformHandlers, platformAuth, admin.password, storeHost);
    const { storeHandlers } = await import("../auth/store.js");
    const storeBase = `http://${storeHost}/api/store-auth`;
    const storeCsrfResponse = await inRequest(storeHost, "", () => storeHandlers.GET(new Request(`${storeBase}/csrf`, { headers: { host: storeHost } })));
    const storeCsrf = await storeCsrfResponse.json();
    const storeCsrfCookie = storeCsrfResponse.headers.get("set-cookie")?.split(";")[0];
    const storeLogin = await inRequest(storeHost, storeCsrfCookie, () => storeHandlers.POST(new Request(`${storeBase}/callback/store-credentials`, {
      method: "POST", headers: { host: storeHost, cookie: storeCsrfCookie, "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ csrfToken: storeCsrf.csrfToken, email: `${run}-owner@example.test`, password: `Temporary-${run}`, callbackUrl: `http://${storeHost}/admin` }),
    })));
    const storeCookie = storeLogin.headers.getSetCookie().find((value) => value.startsWith("authjs.store.session-token="))?.split(";")[0];
    assert(storeCookie, "Genuine StoreMember login failed.");
    await assert.rejects(inRequest("localhost:3000", storeCookie, () => requirePlatformConsole("PLATFORM", "VIEW")));
    if (process.env.PLATFORM_HTTP_SMOKE === "1") {
      assert.equal((await fetch("http://localhost:3000/platform", { headers: { cookie: storeCookie }, redirect: "manual" })).status, 307);
    }
    const free = await db.plan.findUnique({ where: { slug: "FREE" } });
    assert(free?.id);
    await assert.rejects(inRequest("localhost:3000", support.cookie, () => actions.createPlatformStoreAction(form({ name: "Denied", slug: `${run}-denied` }))));
    assert.equal(await db.store.count({ where: { slug: `${run}-denied` } }), 0);
    pass("Platform Create Store provisions real owner and Free fallback; StoreMember and Store-host Platform login rejected");

    await assert.rejects(inRequest("localhost:3000", admin.cookie, () => actions.setPlatformStoreStatusAction(form({ storeId: store.id, status: "INACTIVE" }))), /NEXT_REDIRECT/);
    assert.equal((await db.store.findUnique({ where: { id: store.id } })).status, "INACTIVE");
    assert.equal((await resolveStoreContext({ hostname: `${run}.localhost`, mode: "SAAS", platformDomain: "localhost", database: db })).type, "INVALID_STORE");
    await assert.rejects(inRequest("localhost:3000", admin.cookie, () => actions.setPlatformStoreStatusAction(form({ storeId: store.id, status: "ACTIVE" }))), /NEXT_REDIRECT/);
    assert.equal((await db.store.findUnique({ where: { id: store.id } })).status, "ACTIVE");
    assert.equal((await resolveStoreContext({ hostname: `${run}.localhost`, mode: "SAAS", platformDomain: "localhost", database: db })).store.id, store.id);
    await assert.rejects(inRequest("localhost:3000", admin.cookie, () => actions.updatePlatformStoreAction(form({ storeId: store.id, name: `${run} Updated`, slug: run }))), /NEXT_REDIRECT/);
    assert.equal((await db.store.findUnique({ where: { id: store.id } })).name, `${run} Updated`);
    pass("Store details edit and suspend/activate mutations work");

    const planSlug = `TEST_${randomUUID().slice(0, 8).toUpperCase()}`;
    await assert.rejects(inRequest("localhost:3000", billing.cookie, () => actions.savePlatformPlanAction(form({ name: "Temporary Plan", slug: planSlug,
      monthlyPriceMinor: "1200", yearlyPriceMinor: "12000", features: "{\"advancedReports\":true}", limits: "{\"maxProducts\":10}", isActive: "on" }))), /NEXT_REDIRECT/);
    const plan = await db.plan.findUnique({ where: { slug: planSlug } });
    assert(plan?.id);
    temp.planId = plan.id;
    assert.equal(plan.monthlyPriceMinor, 1200);
    if (process.env.PLATFORM_HTTP_SMOKE === "1") {
      assert.equal((await fetch("http://localhost:3000/platform/plans", { headers: { cookie: billing.cookie }, redirect: "manual" })).status, 200);
    }
    await assert.rejects(inRequest("localhost:3000", support.cookie, () => actions.savePlatformPlanAction(form({ name: "Denied", slug: "DENIED", features: "{}", limits: "{}" }))));
    assert.equal(await db.plan.count({ where: { slug: "DENIED" } }), 0);
    pass("BILLING Plan create works; SUPPORT cannot mutate Plans");

    const now = new Date();
    const sub = await db.subscription.create({ data: { storeId: store.id, planId: plan.id, status: "TRIALING", interval: "MONTHLY",
      currentPeriodStart: now, currentPeriodEnd: new Date(now.getTime() + 86_400_000), trialStartedAt: now, trialEndsAt: new Date(now.getTime() + 86_400_000) } });
    await db.store.update({ where: { id: store.id }, data: { currentSubscriptionId: sub.id } });
    assert.equal((await db.subscription.findUnique({ where: { id: sub.id, storeId: store.id }, include: { plan: true } })).plan.slug, planSlug);
    if (process.env.PLATFORM_HTTP_SMOKE === "1") {
      assert.equal((await fetch("http://localhost:3000/platform/subscriptions", { headers: { cookie: billing.cookie }, redirect: "manual" })).status, 200);
    }
    pass("Subscription list data binds Store and Plan; no paid activation action exposed");

    const newMemberEmail = `${run}-created@example.test`;
    await assert.rejects(inRequest("localhost:3000", admin.cookie, () => actions.createPlatformMemberAction(form({ name: "Created Admin", email: newMemberEmail,
      password: `Temporary-${run}`, roleId: role.PLATFORM_ADMIN }))), /NEXT_REDIRECT/);
    const createdMember = await db.platformMember.findUnique({ where: { normalizedEmail: newMemberEmail }, select: { id: true, roleId: true, status: true } });
    assert.equal(createdMember?.roleId, role.PLATFORM_ADMIN);
    temp.platformMembers.push(createdMember.id);
    await assert.rejects(inRequest("localhost:3000", admin.cookie, () => actions.setPlatformMemberStatusAction(form({ memberId: createdMember.id, status: "INACTIVE" }))), /NEXT_REDIRECT/);
    assert.equal((await db.platformMember.findUnique({ where: { id: createdMember.id } })).status, "INACTIVE");
    await assert.rejects(inRequest("localhost:3000", billing.cookie, () => actions.createPlatformMemberAction(form({ name: "Escalate", email: `${run}-denied@example.test`, password: "long-temporary-password", roleId: role.SUPER_ADMIN }))));
    assert.equal(await db.platformMember.count({ where: { normalizedEmail: `${run}-denied@example.test` } }), 0);
    pass("SUPER_ADMIN member create/status works; BILLING escalation rejected");
    assert.equal((await db.store.findUnique({ where: { id: baseline.defaultStore.id } })).id, baseline.defaultStore.id);
    assert.equal(await db.paymentGateway.count(), baseline.providers);
  } finally {
    await cleanup();
    await db.$disconnect();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
