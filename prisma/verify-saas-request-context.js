const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const { AsyncLocalStorage } = require("node:async_hooks");
const { registerHooks } = require("node:module");
const path = require("node:path");
const { fileURLToPath, pathToFileURL } = require("node:url");
const { PrismaClient } = require("@prisma/client");

require("dotenv/config");

const databaseName = new URL(process.env.DATABASE_URL || "mongodb://invalid/none")
  .pathname.replace(/^\//, "");
if (databaseName !== "shopzdv") {
  throw new Error(`Refusing SAAS request-context verification outside shopzdv (got ${databaseName}).`);
}

// These overrides exist only in this verifier process; .env and application code stay unchanged.
process.env.DEPLOYMENT_MODE = "SAAS";
process.env.PLATFORM_DOMAIN = "localhost";
process.env.AUTH_SECRET ||= randomUUID().replaceAll("-", "");
globalThis.AsyncLocalStorage ??= AsyncLocalStorage;
const nextEntryUrls = Object.fromEntries(
  ["next/headers", "next/cache", "next/server", "next/navigation"].map((entry) => [
    entry, pathToFileURL(require.resolve(entry)).href,
  ]),
);
const projectRoot = path.resolve(__dirname, "..");
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (nextEntryUrls[specifier]) {
      return { url: nextEntryUrls[specifier], shortCircuit: true };
    }
    if (specifier.startsWith("@/")) {
      const target = path.join(projectRoot, specifier.slice(2));
      return { url: pathToFileURL(path.extname(target) ? target : `${target}.js`).href, shortCircuit: true };
    }
    if (specifier.startsWith(".") &&
        context.parentURL?.startsWith(pathToFileURL(projectRoot).href) &&
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
const prisma = new PrismaClient();
const token = randomUUID().replaceAll("-", "");
const created = [];

async function inRequest(hostname, callback) {
  return workAsyncStorage.run({ route: "/phase65-saas-verification", incrementalCache: {} }, () =>
    workUnitAsyncStorage.run({
      type: "request",
      headers: new Headers({ host: hostname }),
    }, callback));
}

async function main() {
  const context = await import("../backend/services/storeContextService.js");
  const productAction = await import("../backend/serverActions/productActions.js");
  const orderAction = await import("../backend/serverActions/orderActions.js");
  const paymentAction = await import("../backend/serverActions/paymentAction.js");
  const { hasStorePermission } = await import("../backend/services/identityAuthorization.server.js");
  assert.equal(typeof productAction.createProductAction, "function");
  assert.equal(typeof orderAction.createOrder, "function");
  const { getDeploymentMode } = await import("../backend/services/deploymentModeService.js");
  assert.equal(getDeploymentMode(), "SAAS");
  const defaultStore = await prisma.store.findUnique({ where: { slug: "default" }, select: { id: true } });
  assert(defaultStore, "Seeded default Store is missing.");
  const identityBaseline = {
    users: await prisma.user.count(),
    legacySuperAdminId: (await prisma.user.findFirst({
      where: { role: { name: "SUPER_ADMIN" } }, select: { id: true },
    }))?.id,
    platformMembers: await prisma.platformMember.count(),
    storeMembers: await prisma.storeMember.count(),
    storeCustomers: await prisma.storeCustomer.count(),
    seededGateways: await prisma.paymentGateway.count({ where: { storeId: defaultStore.id } }),
    seededCouriers: await prisma.courierProvider.count({ where: { storeId: defaultStore.id } }),
  };
  assert(identityBaseline.legacySuperAdminId, "Seeded legacy SUPER_ADMIN is missing.");

  try {
    for (const label of ["karim", "rahim"]) {
      const store = await prisma.store.create({
        data: { name: `Temporary ${label}`, slug: `phase65-saas-${label}-${token}` },
      });
      created.push({ label, store });
      const domain = await prisma.storeDomain.create({
        data: {
          storeId: store.id, domain: `${label}-${token}.localhost`,
          type: "CUSTOM", status: "ACTIVE", isVerified: true, isPrimary: true,
        },
      });
      created[created.length - 1].domain = domain;
      const record = created[created.length - 1];
      record.category = await prisma.category.create({
        data: { storeId: store.id, name: `Temporary ${label} category`, slug: `phase65-${token}` },
      });
      record.media = await prisma.media.create({
        data: { storeId: store.id, url: `https://example.test/${token}.jpg`, name: `${token}.jpg`, host: "temporary" },
      });
      record.variationName = await prisma.variationName.create({
        data: { storeId: store.id, name: `phase65-${token}`, categoryId: record.category.id },
      });
      record.variationValue = await prisma.variationValue.create({
        data: { variationId: record.variationName.id, categoryId: record.category.id, value: "temporary" },
      });
      record.codGateway = await prisma.paymentGateway.create({
        data: { storeId: store.id, name: "Temporary COD", code: `phase65-cod-${token}`, adapterKey: "COD", isActive: true },
      });
      record.role = await prisma.storeRole.create({
        data: { storeId: store.id, name: "Temporary owner", code: "OWNER" },
      });
      record.permission = await prisma.storeRolePermission.create({
        data: { roleId: record.role.id, resource: "STORE", action: "VIEW" },
      });
      record.member = await prisma.storeMember.create({
        data: {
          storeId: store.id, name: "Temporary member",
          email: `${label}-${token}@example.test`,
          normalizedEmail: `${label}-${token}@example.test`,
          passwordHash: "temporary-non-login-test-value", roleId: record.role.id,
        },
      });
    }

    const results = {};
    for (const record of created) {
      results[record.label] = await inRequest(record.domain.domain, async () => {
        const resolved = await context.getCurrentStoreContext();
        const store = await context.getCurrentStore();
        const storeId = await context.getCurrentStoreId();
        assert.equal(resolved.type, "STORE");
        assert.equal(resolved.store.id, record.store.id);
        assert.equal(store.id, record.store.id);
        assert.equal(storeId, record.store.id);
        return { hostname: record.domain.domain, result: "STORE", storeMatches: true };
      });
    }
    results.platform = await inRequest("localhost:3000", async () => {
      const resolved = await context.getCurrentStoreContext();
      assert.equal(resolved.type, "PLATFORM");
      assert.equal(await context.getCurrentStore(), null);
      assert.equal(await context.getCurrentStoreId(), null);
      return resolved.type;
    });
    results.unknown = await inRequest(`unknown-${token}.localhost:3000`, async () => {
      const resolved = await context.getCurrentStoreContext();
      assert.equal(resolved.type, "INVALID_STORE");
      assert.equal(await context.getCurrentStoreId(), null);
      return resolved.type;
    });
    results.storeAuthorization = {};
    for (const member of created) {
      for (const requestStore of created) {
        const allowed = await inRequest(requestStore.domain.domain, () => hasStorePermission("STORE", "VIEW", {
          getSession: async () => ({ user: {
            identityType: "STORE_MEMBER", storeMemberId: member.member.id,
            storeId: member.store.id, roleId: member.role.id,
          } }),
        }));
        assert.equal(allowed, member.store.id === requestStore.store.id);
        results.storeAuthorization[`${member.label}Member_${requestStore.label}Host`] = allowed ? "allowed" : "rejected";
      }
    }
    const [a, b] = created;
    const productForm = (categoryId, mediaId, variationName, variationValue, suffix) => {
      const form = new FormData();
      form.set("title", `Temporary ${suffix} ${token}`);
      form.set("slug", `phase65-${suffix}-${token}`);
      form.set("category", categoryId);
      form.set("thumbnail", mediaId);
      form.set("regularPrice", "1");
      form.set("allowOutOfStockOrder", "on");
      if (variationName) form.set("variations", JSON.stringify([{
        matcherId: `phase65-${token}`,
        combination: [{ variation: { id: variationName.id }, value: { id: variationValue.id } }],
      }]));
      return form;
    };
    const runProduct = (form) => inRequest(a.domain.domain, () => productAction.createProductAction(form));
    const beforeProducts = await prisma.product.count({ where: { storeId: a.store.id } });
    const accepted = await runProduct(productForm(a.category.id, a.media.id, null, null, "own"));
    assert.equal(accepted.success, true, `Same-Store product action returned failure: ${accepted.message || "unknown error"}`);
    const afterAccepted = await prisma.product.count({ where: { storeId: a.store.id } });
    assert.equal(afterAccepted, beforeProducts + 1, `Same-Store product was not persisted: ${accepted.message || "unknown error"}`);
    const rejected = {};
    for (const [caseName, form] of [
      ["categoryB", productForm(b.category.id, a.media.id, null, null, "foreign-category")],
      ["mediaB", productForm(a.category.id, b.media.id, null, null, "foreign-media")],
      ["variationB", productForm(a.category.id, a.media.id, b.variationName, b.variationValue, "foreign-variation")],
    ]) {
      const response = await runProduct(form);
      assert.equal(response.success, false, `${caseName}: action accepted a foreign relation`);
      assert.equal(await prisma.product.count({ where: { storeId: a.store.id } }), afterAccepted,
        `${caseName}: action persisted a cross-Store product`);
      rejected[caseName] = response.message;
    }
    results.productAction = { sameStorePersisted: true, rejected };
    const acceptedB = await inRequest(b.domain.domain, () => productAction.createProductAction(
      productForm(b.category.id, b.media.id, null, null, "own-b")));
    assert.equal(acceptedB.success, true, `Store B product creation failed: ${acceptedB.message || "unknown error"}`);
    const [productA, productB] = await Promise.all([
      prisma.product.findFirst({ where: { storeId: a.store.id }, include: { variations: true } }),
      prisma.product.findFirst({ where: { storeId: b.store.id }, include: { variations: true } }),
    ]);
    assert(productA?.variations?.[0] && productB?.variations?.[0]);
    const orderForm = (variationId, paymentMethod = "COD", paymentGatewayId = null) => {
      const form = new FormData();
      form.set("customerName", "Temporary Test");
      form.set("phoneNumber", "00000000000");
      form.set("email", "temporary@example.test");
      form.set("ttclid", "");
      form.set("district", "Dhaka");
      form.set("thana", "Test");
      form.set("deliveryAddress", "Temporary address");
      form.set("paymentMethod", paymentMethod);
      if (paymentGatewayId) form.set("paymentGatewayId", paymentGatewayId);
      form.set("products", JSON.stringify([{ title: "Temporary", quantity: 1, variation: { id: variationId } }]));
      return form;
    };
    const ownOrder = await inRequest(a.domain.domain, () => orderAction.createOrder(orderForm(productA.variations[0].id)));
    assert.equal(ownOrder.success, true, `Same-Store order failed: ${ownOrder.error || "unknown error"}`);
    const beforeForeignOrder = await prisma.order.count({ where: { storeId: a.store.id } });
    const foreignOrder = await inRequest(a.domain.domain, () => orderAction.createOrder(orderForm(productB.variations[0].id)));
    assert.equal(foreignOrder.success, false, "Order action accepted Store B product");
    assert.equal(await prisma.order.count({ where: { storeId: a.store.id } }), beforeForeignOrder);
    const foreignGatewayOrder = await inRequest(a.domain.domain, () => orderAction.createOrder(
      orderForm(productA.variations[0].id, "ONLINE", b.codGateway.id)));
    assert.equal(foreignGatewayOrder.success, false, "Order action accepted Store B gateway");
    assert.equal(await prisma.order.count({ where: { storeId: a.store.id } }), beforeForeignOrder);
    const beforePayments = await prisma.payment.count({ where: { storeId: a.store.id } });
    await assert.rejects(
      inRequest(a.domain.domain, () => paymentAction.createPayment({
        orderId: ownOrder.data.id, paymentGatewayId: b.codGateway.id,
        paymentMethod: "ONLINE", amount: 1,
      })),
      /selected payment provider is unavailable/i,
    );
    assert.equal(await prisma.payment.count({ where: { storeId: a.store.id } }), beforePayments);
    results.orderAction = {
      sameStoreCreated: true,
      foreignProductRejected: foreignOrder.error,
      foreignGatewayRejected: foreignGatewayOrder.error,
    };
    results.paymentAction = { foreignGatewayRejected: true, noPaymentWritten: true };
    console.log(JSON.stringify({ databaseName, mode: getDeploymentMode(), results }, null, 2));
  } finally {
    const temporaryIds = created.map((record) => record.store.id);
    const temporaryDomainIds = created.map((record) => record.domain?.id).filter(Boolean);
    const temporaryPermissionIds = created.map((record) => record.permission?.id).filter(Boolean);
    for (const record of created.reverse()) {
      const orderIds = (await prisma.order.findMany({ where: { storeId: record.store.id }, select: { id: true } })).map((row) => row.id);
      await prisma.orderTimeline.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.payment.deleteMany({ where: { storeId: record.store.id } });
      await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.order.deleteMany({ where: { storeId: record.store.id } });
      await prisma.orderCounter.deleteMany({ where: { storeId: record.store.id } });
      await prisma.productVariation.deleteMany({ where: { product: { storeId: record.store.id } } });
      await prisma.product.deleteMany({ where: { storeId: record.store.id } });
      await prisma.productCodeCounter.deleteMany({ where: { storeId: record.store.id } });
      if (record.variationName) await prisma.variationValue.deleteMany({ where: { variationId: record.variationName.id } });
      await prisma.variationName.deleteMany({ where: { storeId: record.store.id } });
      await prisma.category.deleteMany({ where: { storeId: record.store.id } });
      await prisma.media.deleteMany({ where: { storeId: record.store.id } });
      await prisma.paymentGateway.deleteMany({ where: { storeId: record.store.id } });
      if (record.member) await prisma.storeMember.delete({ where: { id: record.member.id } });
      if (record.permission) await prisma.storeRolePermission.delete({ where: { id: record.permission.id } });
      if (record.role) await prisma.storeRole.delete({ where: { id: record.role.id } });
      if (record.domain) await prisma.storeDomain.delete({ where: { id: record.domain.id } });
      await prisma.store.delete({ where: { id: record.store.id } });
    }
    assert.equal(await prisma.store.count({ where: { slug: { startsWith: "phase65-saas-", endsWith: token } } }), 0);
    assert.equal(await prisma.storeDomain.count({ where: { id: { in: temporaryDomainIds } } }), 0);
    assert.equal(await prisma.storeRolePermission.count({ where: { id: { in: temporaryPermissionIds } } }), 0);
    for (const model of [
      "category", "media", "variationName", "product", "productCodeCounter",
      "order", "orderCounter", "payment", "paymentGateway",
      "storeMember", "storeRole",
    ]) {
      assert.equal(await prisma[model].count({ where: { storeId: { in: temporaryIds } } }), 0,
        `${model}: temporary rows remain`);
    }
    assert.deepEqual({
      users: await prisma.user.count(),
      legacySuperAdminId: (await prisma.user.findFirst({
        where: { role: { name: "SUPER_ADMIN" } }, select: { id: true },
      }))?.id,
      platformMembers: await prisma.platformMember.count(),
      storeMembers: await prisma.storeMember.count(),
      storeCustomers: await prisma.storeCustomer.count(),
      seededGateways: await prisma.paymentGateway.count({ where: { storeId: defaultStore.id } }),
      seededCouriers: await prisma.courierProvider.count({ where: { storeId: defaultStore.id } }),
    }, identityBaseline);
    assert.equal(await prisma.store.findUnique({ where: { slug: "default" }, select: { id: true } }).then((store) => store?.id), defaultStore.id);
    console.log("Temporary SAAS Stores and domains cleaned up; default Store unchanged.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
