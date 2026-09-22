const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const { AsyncLocalStorage } = require("node:async_hooks");
const { registerHooks } = require("node:module");
const path = require("node:path");
const { fileURLToPath, pathToFileURL } = require("node:url");
const { PrismaClient } = require("@prisma/client");
const { STORE_PERMISSIONS } = require("./seed-identity-foundation.js");

require("dotenv/config");
const databaseName = new URL(process.env.DATABASE_URL || "mongodb://invalid/none").pathname.replace(/^\//, "");
if (databaseName !== "shopzdv") throw new Error("Refusing Store action verification outside shopzdv.");
process.env.DEPLOYMENT_MODE = "SAAS";
process.env.PLATFORM_DOMAIN = "localhost";
process.env.STORE_AUTH_SECRET ||= randomUUID().replaceAll("-", "");
process.env.AUTH_SECRET ||= randomUUID().replaceAll("-", "");
globalThis.AsyncLocalStorage ??= AsyncLocalStorage;

const projectRoot = path.resolve(__dirname, "..");
const nextEntryUrls = Object.fromEntries(
  ["next/headers", "next/cache", "next/server", "next/navigation"].map((entry) => [
    entry, pathToFileURL(require.resolve(entry)).href,
  ]),
);
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (nextEntryUrls[specifier]) return { url: nextEntryUrls[specifier], shortCircuit: true };
    if (specifier.startsWith("@/")) {
      const target = path.join(projectRoot, specifier.slice(2));
      return { url: pathToFileURL(path.extname(target) ? target : `${target}.js`).href, shortCircuit: true };
    }
    if (specifier.startsWith(".") && context.parentURL?.startsWith(pathToFileURL(projectRoot).href) && !context.parentURL.includes("/node_modules/")) {
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
const records = [];
const results = { databaseName, mode: "SAAS", auth: "real Auth.js credentials callback", inventory: {}, procurement: {}, finance: {}, paymentRefund: {}, reports: {}, pos: {}, authorization: {} };

function inRequest(hostname, cookie, callback) {
  return workAsyncStorage.run({ route: "/phase65d-actions", incrementalCache: {} }, () =>
    workUnitAsyncStorage.run({
      type: "request",
      headers: new Headers({ host: hostname, "x-forwarded-proto": "http", ...(cookie ? { cookie } : {}) }),
    }, callback));
}

function form(values) {
  const result = new FormData();
  for (const [key, value] of Object.entries(values)) result.set(key, typeof value === "string" ? value : JSON.stringify(value));
  if ((values.warehouseId && values.variationId && "quantity" in values) || (values.purchaseOrderId && values.warehouseId && "items" in values)) {
    if (!result.has("operationId")) result.set("operationId", randomUUID());
  }
  return result;
}

async function snapshotOwned(storeId) {
  const [warehouses, stocks, transactions, purchaseOrders, receipts, payments, accounts, orders, customerPayments, refunds, movements, journals, expenses] = await Promise.all([
    prisma.warehouse.findMany({ where: { storeId }, select: { id: true }, orderBy: { id: "asc" } }),
    prisma.stock.findMany({ where: { storeId }, select: { id: true, quantity: true, available: true }, orderBy: { id: "asc" } }),
    prisma.inventoryTransaction.count({ where: { storeId } }),
    prisma.purchaseOrder.findMany({ where: { storeId }, select: { id: true, status: true, dueAmount: true, paidAmount: true, items: { select: { id: true, receivedQty: true } } }, orderBy: { id: "asc" } }),
    prisma.goodsReceipt.count({ where: { storeId } }),
    prisma.supplierPayment.count({ where: { storeId } }),
    prisma.moneyAccount.findMany({ where: { storeId }, select: { id: true, balance: true }, orderBy: { id: "asc" } }),
    prisma.order.count({ where: { storeId } }),
    prisma.payment.count({ where: { storeId } }),
    prisma.refund.count({ where: { storeId } }),
    prisma.moneyTransaction.count({ where: { storeId } }),
    prisma.journalEntry.count({ where: { storeId } }),
    prisma.expense.count({ where: { storeId } }),
  ]);
  return { warehouses, stocks, transactions, purchaseOrders, receipts, payments, accounts, orders, customerPayments, refunds, movements, journals, expenses };
}

async function login(record, storeHandlers, storeAuth) {
  const baseUrl = `http://${record.hostname}:3000/api/store-auth`;
  const csrfResponse = await inRequest(`${record.hostname}:3000`, "", () => storeHandlers.GET(
    new Request(`${baseUrl}/csrf`, { headers: { host: `${record.hostname}:3000` } }),
  ));
  const csrf = await csrfResponse.json();
  const csrfCookie = csrfResponse.headers.get("set-cookie")?.split(";")[0];
  assert.equal(csrfResponse.status, 200);
  assert(csrf.csrfToken && csrfCookie);
  const response = await inRequest(`${record.hostname}:3000`, csrfCookie, () => storeHandlers.POST(
    new Request(`${baseUrl}/callback/store-credentials`, {
      method: "POST",
      headers: { host: `${record.hostname}:3000`, cookie: csrfCookie, "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ csrfToken: csrf.csrfToken, email: record.email, password: record.password, callbackUrl: `http://${record.hostname}:3000/` }),
    }),
  ));
  record.cookie = response.headers.getSetCookie()
    .find((value) => value.startsWith("authjs.store.session-token="))?.split(";")[0];
  assert(record.cookie, `Store ${record.label}: real Auth.js login failed (HTTP ${response.status}).`);
  const session = await inRequest(`${record.hostname}:3000`, record.cookie, () => storeAuth());
  assert.equal(session?.user?.storeMemberId, record.member.id);
  assert.equal(session?.user?.storeId, record.store.id);
}

async function loginLegacy(hostname = "localhost") {
  assert(process.env.SUPER_ADMIN_EMAIL && process.env.SUPER_ADMIN_PASSWORD, "Legacy admin credentials are required for compatibility verification.");
  const { GET, POST, auth } = await import("../auth.js");
  const host = `${hostname}:3000`;
  const baseUrl = `http://${host}/api/auth`;
  const csrfResponse = await inRequest(host, "", () => GET(new Request(`${baseUrl}/csrf`, { headers: { host } })));
  const csrf = await csrfResponse.json();
  const csrfCookie = csrfResponse.headers.get("set-cookie")?.split(";")[0];
  assert(csrf.csrfToken && csrfCookie);
  const response = await inRequest(host, csrfCookie, () => POST(new Request(`${baseUrl}/callback/credentials`, {
    method: "POST",
    headers: { host, cookie: csrfCookie, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ csrfToken: csrf.csrfToken, email: process.env.SUPER_ADMIN_EMAIL, password: process.env.SUPER_ADMIN_PASSWORD, callbackUrl: `http://${host}/admin` }),
  })));
  const cookie = response.headers.getSetCookie().find((value) => value.startsWith("authjs.session-token="))?.split(";")[0];
  assert(cookie, `Legacy SUPER_ADMIN login failed (HTTP ${response.status}).`);
  const { getToken } = await import("next-auth/jwt");
  const { NextRequest } = await import("next/server");
  const token = await getToken({ req: new NextRequest(`http://${host}/admin`, { headers: { cookie } }), secret: process.env.AUTH_SECRET, secureCookie: false });
  assert.equal(token?.role, "SUPER_ADMIN", `Legacy token did not contain SUPER_ADMIN (HTTP ${response.status}, redirect ${response.headers.get("location") || "none"}).`);
  const sessionResponse = await inRequest(host, cookie, () => GET(new Request(`${baseUrl}/session`, { headers: { host, cookie } })));
  const session = await sessionResponse.json();
  assert.equal(session?.user?.role, "SUPER_ADMIN", `Legacy session handler did not return SUPER_ADMIN (HTTP ${sessionResponse.status}).`);
  const actionSession = await inRequest(host, cookie, () => auth());
  assert.equal(actionSession?.user?.role, "SUPER_ADMIN", `Legacy auth() failed on ${host}.`);
  return { cookie, auth };
}

async function makeStore(label, hashPassword, storeHandlers, storeAuth) {
  const record = { label, hostname: `${label}-${token}.localhost`, email: `${label}-${token}@example.test`, password: `Temporary-${token}` };
  records.push(record);
  record.store = await prisma.store.create({ data: { name: `Temporary Store ${label}`, slug: `phase65d-${label}-${token}` } });
  record.domain = await prisma.storeDomain.create({ data: {
    storeId: record.store.id, domain: record.hostname, type: "CUSTOM", status: "ACTIVE", isVerified: true, isPrimary: true,
  } });
  record.role = await prisma.storeRole.create({ data: { storeId: record.store.id, name: "Owner", code: "OWNER" } });
  for (const [resource, action] of STORE_PERMISSIONS.OWNER) {
    await prisma.storeRolePermission.create({ data: { roleId: record.role.id, resource, action } });
  }
  record.member = await prisma.storeMember.create({ data: {
    storeId: record.store.id, name: `Temporary ${label} Owner`, email: record.email,
    normalizedEmail: record.email, passwordHash: await hashPassword(record.password), roleId: record.role.id,
  } });
  await login(record, storeHandlers, storeAuth);
  record.product = await prisma.product.create({ data: {
    storeId: record.store.id, title: `Temporary ${label} product`, slug: `phase65d-${token}`,
  } });
  record.variation = await prisma.productVariation.create({ data: {
    productId: record.product.id, sku: `phase65d-${token}`, matcherId: `phase65d-${token}`, regularPrice: 1,
  } });
  record.supplier = await prisma.supplier.create({ data: {
    storeId: record.store.id, supplierCode: `phase65d-${token}`, companyName: `Temporary ${label} supplier`,
  } });
  record.account = await prisma.moneyAccount.create({ data: {
    storeId: record.store.id, name: `Temporary ${label} cash`, type: "CASH", balance: 10,
  } });
  return record;
}

async function cleanup(baseline) {
  const ids = records.map((record) => record.store?.id).filter(Boolean);
  const roleIds = records.map((record) => record.role?.id).filter(Boolean);
  const productIds = records.map((record) => record.product?.id).filter(Boolean);
  const poIds = (await prisma.purchaseOrder.findMany({ where: { storeId: { in: ids } }, select: { id: true } })).map((row) => row.id);
  const receiptIds = (await prisma.goodsReceipt.findMany({ where: { storeId: { in: ids } }, select: { id: true } })).map((row) => row.id);
  const journalIds = (await prisma.journalEntry.findMany({ where: { storeId: { in: ids } }, select: { id: true } })).map((row) => row.id);
  const orderIds = (await prisma.order.findMany({ where: { storeId: { in: ids } }, select: { id: true } })).map((row) => row.id);
  const testFinancialAccountIds = (await prisma.journalLine.findMany({ where: { journalEntryId: { in: journalIds } }, select: { accountId: true } })).map((row) => row.accountId);
  await prisma.journalLine.deleteMany({ where: { journalEntryId: { in: journalIds } } });
  await prisma.journalEntry.deleteMany({ where: { storeId: { in: ids } } });
  await prisma.ledger.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.orderTimeline.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.deliveryItem.deleteMany({ where: { delivery: { storeId: { in: ids } } } });
  await prisma.delivery.deleteMany({ where: { storeId: { in: ids } } });
  await prisma.refund.deleteMany({ where: { storeId: { in: ids } } });
  await prisma.payment.deleteMany({ where: { storeId: { in: ids } } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { storeId: { in: ids } } });
  await prisma.orderCounter.deleteMany({ where: { storeId: { in: ids } } });
  await prisma.supplierPayment.deleteMany({ where: { storeId: { in: ids } } });
  await prisma.moneyTransaction.deleteMany({ where: { storeId: { in: ids } } });
  await prisma.expense.deleteMany({ where: { storeId: { in: ids } } });
  await prisma.expenseCategory.deleteMany({ where: { storeId: { in: ids } } });
  await prisma.goodsReceiptItem.deleteMany({ where: { goodsReceiptId: { in: receiptIds } } });
  await prisma.goodsReceipt.deleteMany({ where: { storeId: { in: ids } } });
  await prisma.inventoryTransaction.deleteMany({ where: { storeId: { in: ids } } });
  await prisma.stock.deleteMany({ where: { storeId: { in: ids } } });
  await prisma.purchaseItem.deleteMany({ where: { purchaseOrderId: { in: poIds } } });
  await prisma.purchaseOrder.deleteMany({ where: { storeId: { in: ids } } });
  await prisma.counter.deleteMany({ where: { storeId: { in: ids } } });
  await prisma.warehouse.deleteMany({ where: { storeId: { in: ids } } });
  await prisma.paymentGateway.deleteMany({ where: { storeId: { in: ids } } });
  await prisma.moneyAccount.deleteMany({ where: { storeId: { in: ids } } });
  await prisma.supplier.deleteMany({ where: { storeId: { in: ids } } });
  await prisma.productVariation.deleteMany({ where: { productId: { in: productIds } } });
  await prisma.product.deleteMany({ where: { storeId: { in: ids } } });
  await prisma.storeMember.deleteMany({ where: { storeId: { in: ids } } });
  await prisma.storeRolePermission.deleteMany({ where: { roleId: { in: roleIds } } });
  await prisma.storeRole.deleteMany({ where: { storeId: { in: ids } } });
  await prisma.storeDomain.deleteMany({ where: { storeId: { in: ids } } });
  await prisma.store.deleteMany({ where: { id: { in: ids } } });
  const newAccountIds = [...new Set(testFinancialAccountIds)].filter((id) => !baseline.financialAccountIds.includes(id));
  for (const id of newAccountIds) {
    if (await prisma.journalLine.count({ where: { accountId: id } }) === 0) await prisma.financialAccount.delete({ where: { id } });
  }
  for (const model of ["store", "storeDomain", "storeMember", "storeRole", "product", "supplier", "moneyAccount", "paymentGateway", "warehouse", "stock", "inventoryTransaction", "purchaseOrder", "goodsReceipt", "supplierPayment", "counter", "journalEntry", "moneyTransaction", "payment", "refund", "expense"]) {
    const where = model === "store" ? { id: { in: ids } } : { storeId: { in: ids } };
    assert.equal(await prisma[model].count({ where }), 0, `${model}: temporary records remain`);
  }
  assert.equal(await prisma.storeRolePermission.count({ where: { roleId: { in: roleIds } } }), 0);
  assert.equal(await prisma.productVariation.count({ where: { productId: { in: productIds } } }), 0);
  assert.deepEqual({
    defaultStoreId: (await prisma.store.findUnique({ where: { slug: "default" }, select: { id: true } }))?.id,
    users: await prisma.user.count(),
    superAdminId: (await prisma.user.findFirst({ where: { role: { name: "SUPER_ADMIN" } }, select: { id: true } }))?.id,
    members: await prisma.storeMember.count(),
    gateways: await prisma.paymentGateway.count({ where: { storeId: baseline.defaultStoreId } }),
    couriers: await prisma.courierProvider.count({ where: { storeId: baseline.defaultStoreId } }),
    financialAccountIds: (await prisma.financialAccount.findMany({ select: { id: true }, orderBy: { id: "asc" } })).map((row) => row.id),
    journalLines: await prisma.journalLine.count(),
  }, baseline);
  console.log("Temporary Store A/B records and identities cleaned up; seeded records unchanged.");
}

async function main() {
  const { hashPassword } = await import("../backend/utils/password.server.js");
  const { storeHandlers, storeAuth } = await import("../auth/store.js");
  const { createWarehouse } = await import("../backend/serverActions/warehouseAction.js");
  const { adjustStock } = await import("../backend/serverActions/inventoryAction.js");
  const { createPurchaseOrder } = await import("../backend/serverActions/purchaseAction.js");
  const { createGoodsReceipt } = await import("../backend/serverActions/goodsReceiptAction.js");
  const { createSupplierPayment } = await import("../backend/serverActions/supplierPaymentAction.js");
  const { createPosSale, getPosSales } = await import("../backend/serverActions/posAction.js");
  const { createExpenseCategory, createExpense } = await import("../backend/serverActions/expenseAction.js");
  const { getMoneyManagement, recordMoneyMovement } = await import("../backend/serverActions/moneyAccountAction.js");
  const { getAccountingDashboard } = await import("../backend/serverActions/accountingAction.js");
  const { getJournalEntries } = await import("../backend/serverActions/accountingAction.js");
  const paymentActions = await import("../backend/serverActions/paymentAction.js");
  const { refundPayment } = await import("../backend/serverActions/refundAction.js");
  const { processRefundAction, updateOrderStatusAction } = await import("../backend/serverActions/orderActions.js");
  const { getProcurementSectionData } = await import("../backend/serverActions/procurementQueryAction.js");
  const { getAdminAccess, requireAdminStoreEntry } = await import("../backend/services/adminStoreAccess.server.js");
  const { default: proxy } = await import("../proxy.js");
  const { NextRequest } = await import("next/server");
  const baseline = {
    defaultStoreId: (await prisma.store.findUnique({ where: { slug: "default" }, select: { id: true } }))?.id,
    users: await prisma.user.count(),
    superAdminId: (await prisma.user.findFirst({ where: { role: { name: "SUPER_ADMIN" } }, select: { id: true } }))?.id,
    members: await prisma.storeMember.count(),
    gateways: 0, couriers: 0,
    financialAccountIds: (await prisma.financialAccount.findMany({ select: { id: true }, orderBy: { id: "asc" } })).map((row) => row.id),
    journalLines: await prisma.journalLine.count(),
  };
  assert(baseline.defaultStoreId && baseline.superAdminId);
  assert.equal("markPaymentSuccess" in paymentActions, false, "Provider posting must not be a browser-callable server action.");
  baseline.gateways = await prisma.paymentGateway.count({ where: { storeId: baseline.defaultStoreId } });
  baseline.couriers = await prisma.courierProvider.count({ where: { storeId: baseline.defaultStoreId } });

  const act = (record, action, input, hostname = record.hostname) =>
    inRequest(`${hostname}:3000`, record.cookie, () => action(input));
  try {
    const a = await makeStore("karim", hashPassword, storeHandlers, storeAuth);
    const b = await makeStore("rahim", hashPassword, storeHandlers, storeAuth);
    const { cookie: legacyCookie } = await loginLegacy();
    const legacyRoute = await proxy(new NextRequest("http://localhost:3000/admin/orders", { headers: { cookie: legacyCookie } }));
    assert.equal(legacyRoute.status, 200);
    const storeRoute = await proxy(new NextRequest(`http://${a.hostname}:3000/admin/pos`, { headers: { cookie: a.cookie } }));
    assert.equal(storeRoute.status, 200);
    const deniedUnmigrated = await proxy(new NextRequest(`http://${a.hostname}:3000/admin/orders`, { headers: { cookie: a.cookie } }));
    assert.equal(deniedUnmigrated.status, 307);
    const bothCookies = `${legacyCookie}; ${a.cookie}`;
    const noFallback = await inRequest(`${b.hostname}:3000`, bothCookies, () => getAdminAccess("POS", "CREATE", "pos"));
    assert.deepEqual(noFallback, { allowed: false, identity: "STORE_MEMBER" });
    results.authorization.legacyAndNoFallback = "legacy admin preserved; StoreMember credential takes precedence";

    for (const record of [a, b]) {
      const entry = await inRequest(`${record.hostname}:3000`, record.cookie, () => requireAdminStoreEntry());
      const posAccess = await inRequest(`${record.hostname}:3000`, record.cookie, () => getAdminAccess("POS", "CREATE", "pos"));
      const accountAccess = await inRequest(`${record.hostname}:3000`, record.cookie, () => getAdminAccess("MONEY_ACCOUNT", "VIEW", "accounting"));
      assert.equal(entry, "STORE_MEMBER");
      assert.deepEqual(posAccess, { allowed: true, identity: "STORE_MEMBER" });
      assert.deepEqual(accountAccess, { allowed: true, identity: "STORE_MEMBER" });
      results.authorization[`${record.label}AdminFinanceEntry`] = "allowed with real StoreMember session";
    }

    for (const record of [a, b]) {
      const response = await act(record, createWarehouse, form({ code: `W${record.label.toUpperCase()}${token.slice(0, 6)}`, name: `Temporary ${record.label} warehouse` }));
      assert.equal(response.success, true, `Store ${record.label} warehouse: ${response.message}`);
      record.warehouse = response.data;
      const adjustment = await act(record, adjustStock, form({ warehouseId: record.warehouse.id, variationId: record.variation.id, quantity: 1 }));
      assert.equal(adjustment.success, true, `Store ${record.label} stock adjustment: ${adjustment.message}`);
      results.inventory[`${record.label}OwnWarehouseAndStock`] = "allowed";
    }

    for (const [own, foreign] of [[a, b], [b, a]]) {
      const before = await snapshotOwned(own.store.id);
      const beforeForeign = await snapshotOwned(foreign.store.id);
      for (const [caseName, values] of [
        ["foreignWarehouse", { warehouseId: foreign.warehouse.id, variationId: own.variation.id, quantity: 1 }],
        ["foreignVariation", { warehouseId: own.warehouse.id, variationId: foreign.variation.id, quantity: 1 }],
      ]) {
        const response = await act(own, adjustStock, form(values));
        assert.equal(response.success, false, `${own.label}: ${caseName} accepted`);
        assert.deepEqual(await snapshotOwned(own.store.id), before, `${own.label}: ${caseName} changed records`);
        assert.deepEqual(await snapshotOwned(foreign.store.id), beforeForeign, `${own.label}: ${caseName} changed foreign records`);
        results.inventory[`${own.label}_${caseName}`] = "rejected without writes";
      }
    }

    const poForm = (supplier, product, variation) => form({
      supplierId: supplier.id,
      items: [{ productId: product.id, variationId: variation.id, quantity: 1, unitCost: 0, discount: 0 }],
    });
    for (const record of [a, b]) {
      const response = await act(record, createPurchaseOrder, poForm(record.supplier, record.product, record.variation));
      assert.equal(response.success, true, `Store ${record.label} Purchase Order: ${response.message}`);
      record.po = response.data;
      results.procurement[`${record.label}OwnPurchaseOrder`] = "allowed";
    }
    for (const [own, foreign] of [[a, b], [b, a]]) {
      const before = await snapshotOwned(own.store.id);
      const beforeForeign = await snapshotOwned(foreign.store.id);
      for (const [caseName, input] of [
        ["foreignSupplier", poForm(foreign.supplier, own.product, own.variation)],
        ["foreignProduct", poForm(own.supplier, foreign.product, foreign.variation)],
      ]) {
        const response = await act(own, createPurchaseOrder, input);
        assert.equal(response.success, false, `${own.label}: ${caseName} Purchase Order accepted`);
        assert.deepEqual(await snapshotOwned(own.store.id), before);
        assert.deepEqual(await snapshotOwned(foreign.store.id), beforeForeign);
        results.procurement[`${own.label}PurchaseOrder_${caseName}`] = "rejected without writes";
      }
    }

    for (const record of [a, b]) {
      const item = await prisma.purchaseItem.findFirst({ where: { purchaseOrderId: record.po.id } });
      assert(item);
      record.poItem = item;
      const response = await act(record, createGoodsReceipt, form({
        purchaseOrderId: record.po.id, warehouseId: record.warehouse.id,
        items: [{ purchaseItemId: item.id, variationId: record.variation.id, quantity: 1, supplierLotNumber: `LOT-${token}` }],
      }));
      assert.equal(response.success, true, `Store ${record.label} Goods Receipt: ${response.message}`);
      record.receipt = response.data;
      results.procurement[`${record.label}OwnGoodsReceipt`] = "allowed";
    }
    for (const [own, foreign] of [[a, b], [b, a]]) {
      const before = await snapshotOwned(own.store.id);
      const beforeForeign = await snapshotOwned(foreign.store.id);
      for (const [caseName, purchaseOrderId, warehouseId, purchaseItemId, variationId] of [
        ["foreignPurchaseOrder", foreign.po.id, own.warehouse.id, foreign.poItem.id, foreign.variation.id],
        ["foreignWarehouse", own.po.id, foreign.warehouse.id, own.poItem.id, own.variation.id],
      ]) {
        const response = await act(own, createGoodsReceipt, form({
          purchaseOrderId, warehouseId,
          items: [{ purchaseItemId, variationId, quantity: 1, supplierLotNumber: `LOT-${token}` }],
        }));
        assert.equal(response.success, false, `${own.label}: ${caseName} Goods Receipt accepted`);
        assert.deepEqual(await snapshotOwned(own.store.id), before);
        assert.deepEqual(await snapshotOwned(foreign.store.id), beforeForeign);
        results.procurement[`${own.label}GoodsReceipt_${caseName}`] = "rejected without writes";
      }
    }

    // These temporary POs are received but have zero cost. Set a local test due
    // amount so SupplierPayment reaches its foreign-reference checks; no journal posts.
    for (const record of [a, b]) {
      await prisma.purchaseOrder.update({ where: { id: record.po.id, storeId: record.store.id }, data: { total: 1, dueAmount: 1 } });
    }
    for (const [own, foreign] of [[a, b], [b, a]]) {
      const before = await snapshotOwned(own.store.id);
      const beforeForeign = await snapshotOwned(foreign.store.id);
      for (const [caseName, values] of [
        ["foreignSupplier", { supplierId: foreign.supplier.id, purchaseOrderId: own.po.id, moneyAccountId: own.account.id, amount: 1 }],
        ["foreignPurchaseOrder", { supplierId: foreign.supplier.id, purchaseOrderId: foreign.po.id, moneyAccountId: own.account.id, amount: 1 }],
        ["foreignMoneyAccount", { supplierId: own.supplier.id, purchaseOrderId: own.po.id, moneyAccountId: foreign.account.id, amount: 1 }],
      ]) {
        const response = await act(own, createSupplierPayment, form(values));
        assert.equal(response.success, false, `${own.label}: ${caseName} Supplier Payment accepted`);
        assert.deepEqual(await snapshotOwned(own.store.id), before);
        assert.deepEqual(await snapshotOwned(foreign.store.id), beforeForeign);
        results.procurement[`${own.label}SupplierPayment_${caseName}`] = "rejected without writes";
      }
    }

    for (const record of [a, b]) {
      const before = await snapshotOwned(record.store.id);
      const posted = await act(record, createSupplierPayment, form({
        supplierId: record.supplier.id, purchaseOrderId: record.po.id,
        moneyAccountId: record.account.id, amount: 1,
      }));
      assert.equal(posted.success, true, `${record.label} SupplierPayment posting: ${posted.message}`);
      const after = await snapshotOwned(record.store.id);
      assert.equal(after.payments, before.payments + 1);
      assert.equal(after.movements, before.movements + 1);
      assert.equal(after.journals, before.journals + 1);
      assert.equal(after.accounts[0].balance, before.accounts[0].balance - 1);
      results.finance[`${record.label}SupplierPayment`] = "posted to own Store only";

      const category = await act(record, createExpenseCategory, form({ name: `Temporary ${record.label} expense` }));
      assert.equal(category.success, true, category.message);
      const expense = await act(record, createExpense, form({ categoryId: category.data.id, moneyAccountId: record.account.id, amount: record === a ? 1 : 2 }));
      assert.equal(expense.success, true, expense.message);
      const movement = await act(record, recordMoneyMovement, form({ type: "FUND_ADD", amount: record === a ? 2 : 11, toAccountId: record.account.id }));
      assert.equal(movement.success, true, movement.message);
      const accounts = await act(record, getMoneyManagement, {});
      const reports = await act(record, getAccountingDashboard, {});
      const expenses = await inRequest(`${record.hostname}:3000`, record.cookie, () => getProcurementSectionData("expenses", {}));
      const supplierPayments = await inRequest(`${record.hostname}:3000`, record.cookie, () => getProcurementSectionData("payments", {}));
      assert.equal(accounts.success, true, accounts.message);
      assert.equal(reports.success, true, reports.message);
      assert.equal(expenses.success, true, expenses.message);
      assert.equal(supplierPayments.success, true, supplierPayments.message);
      assert(accounts.data.allAccounts.every((row) => row.storeId === record.store.id));
      assert(accounts.data.transactions.every((row) => row.storeId === record.store.id));
      assert(expenses.data.expenses.every((row) => row.storeId === record.store.id));
      assert(supplierPayments.data.payments.every((row) => row.storeId === record.store.id));
      results.finance[`${record.label}ActionsAndReports`] = "genuine session, own Store only";
    }

    await prisma.productVariation.update({ where: { id: b.variation.id }, data: { regularPrice: 9 } });
    a.posAmount = 1;
    b.posAmount = 9;
    const posForm = (warehouse, variation, account, extra = {}) => form({
      warehouseId: warehouse.id, moneyAccountId: account.id,
      items: [{ variationId: variation.id, quantity: 1 }], ...extra,
    });
    for (const record of [a, b]) {
      const before = await snapshotOwned(record.store.id);
      const foreignStoreId = record === a ? b.store.id : a.store.id;
      const sale = await act(record, createPosSale, posForm(record.warehouse, record.variation, record.account, { storeId: foreignStoreId }));
      assert.equal(sale.success, true, `${record.label} POS sale: ${sale.message}`);
      const after = await snapshotOwned(record.store.id);
      assert.equal(after.orders, before.orders + 1);
      assert.equal(after.customerPayments, before.customerPayments + 1);
      assert.equal(after.movements, before.movements + 1);
      assert.equal(after.journals, before.journals + 1);
      assert.equal(after.transactions, before.transactions + 1);
      assert.equal(after.accounts[0].balance, before.accounts[0].balance + record.posAmount);
      assert.equal(after.stocks[0].quantity, before.stocks[0].quantity - 1);
      const payment = await prisma.payment.findFirst({ where: { storeId: record.store.id, gateway: "POS" }, include: { order: true, moneyTransactions: true } });
      assert(payment && payment.order.storeId === record.store.id && payment.moneyTransactions.length === 1);
      const sales = await act(record, getPosSales, { warehouseId: record.warehouse.id });
      assert.equal(sales.success, true, sales.message);
      assert(sales.data.some((row) => row.id === sale.data?.orderId), "POS sale missing from Store report");
      assert.equal(sales.summary.total, record.posAmount);
      results.pos[`${record.label}OwnSale`] = "Order, Payment, MoneyTransaction, Journal and stock posted; client storeId ignored";
    }
    for (const [own, foreign] of [[a, b], [b, a]]) {
      const before = await snapshotOwned(own.store.id);
      const beforeForeign = await snapshotOwned(foreign.store.id);
      for (const [name, input] of [
        ["foreignWarehouse", posForm(foreign.warehouse, own.variation, own.account)],
        ["foreignVariation", posForm(own.warehouse, foreign.variation, own.account)],
        ["foreignMoneyAccount", posForm(own.warehouse, own.variation, foreign.account)],
      ]) {
        const sale = await act(own, createPosSale, input);
        assert.equal(sale.success, false, `${own.label} POS ${name} accepted`);
        assert.deepEqual(await snapshotOwned(own.store.id), before);
        assert.deepEqual(await snapshotOwned(foreign.store.id), beforeForeign);
        results.pos[`${own.label}_${name}`] = "rejected without writes";
      }
    }

    for (const record of [a, b]) {
      record.gateway = await prisma.paymentGateway.create({ data: {
        storeId: record.store.id, code: "COD", name: `Temporary ${record.label} COD`, adapterKey: "COD", isActive: true,
      } });
      record.webOrder = await prisma.order.create({ data: {
        storeId: record.store.id, orderNo: `P7B-${record.label}-${token}`, customerName: "Temporary buyer",
        phoneNumber: "N/A", email: "", orderPrice: record === a ? 1200 : 8200,
        deliveryCharge: 0, deliveryAddress: "Temporary address", paymentMethod: "COD", ttclid: "",
      } });
      const ownPayment = await act(record, paymentActions.createPayment, {
        orderId: record.webOrder.id, paymentGatewayId: record.gateway.id,
        paymentMethod: "COD", amount: record.webOrder.orderPrice,
        storeId: record === a ? b.store.id : a.store.id,
      });
      assert.equal(ownPayment.storeId, record.store.id);
      record.pendingPayment = ownPayment;
      results.paymentRefund[`${record.label}OwnPayment`] = "created with trusted Store despite forged storeId";
    }
    for (const [own, foreign] of [[a, b], [b, a]]) {
      const beforeA = await snapshotOwned(own.store.id);
      const beforeB = await snapshotOwned(foreign.store.id);
      for (const input of [
        { orderId: foreign.webOrder.id, paymentGatewayId: own.gateway.id, paymentMethod: "COD", amount: 1 },
        { orderId: own.webOrder.id, paymentGatewayId: foreign.gateway.id, paymentMethod: "COD", amount: 1 },
      ]) {
        await assert.rejects(act(own, paymentActions.createPayment, input));
        assert.deepEqual(await snapshotOwned(own.store.id), beforeA);
        assert.deepEqual(await snapshotOwned(foreign.store.id), beforeB);
      }
      await prisma.paymentGateway.update({ where: { id: own.gateway.id }, data: { moneyAccountId: foreign.account.id } });
      try {
        await assert.rejects(act(own, paymentActions.createPayment, {
          orderId: own.webOrder.id, paymentGatewayId: own.gateway.id, paymentMethod: "COD", amount: 1,
        }));
        assert.deepEqual(await snapshotOwned(own.store.id), beforeA);
        assert.deepEqual(await snapshotOwned(foreign.store.id), beforeB);
      } finally {
        await prisma.paymentGateway.update({ where: { id: own.gateway.id }, data: { moneyAccountId: null } });
      }
      results.paymentRefund[`${own.label}ForeignOrderAndGateway`] = "rejected without writes";
    }

    // POS supplies a genuinely posted, Store-owned Payment for the refund action.
    for (const record of [a, b]) {
      record.posPayment = await prisma.payment.findFirst({ where: { storeId: record.store.id, gateway: "POS" } });
      assert(record.posPayment?.moneyAccountId === record.account.id);
    }
    for (const record of [a, b]) {
      const foreign = record === a ? b : a;
      const beforeA = await snapshotOwned(record.store.id);
      const beforeB = await snapshotOwned(foreign.store.id);
      for (const input of [
        { orderId: foreign.posPayment?.orderId, paymentId: record.posPayment.id, amount: 1 },
        { orderId: record.posPayment.orderId, paymentId: foreign.posPayment?.id, amount: 1 },
        { orderId: record.posPayment.orderId, paymentId: record.posPayment.id, amount: record.posAmount + 1 },
      ]) {
        await assert.rejects(act(record, refundPayment, input));
        assert.deepEqual(await snapshotOwned(record.store.id), beforeA);
        assert.deepEqual(await snapshotOwned(foreign.store.id), beforeB);
      }
      await prisma.payment.update({ where: { id: record.posPayment.id }, data: { moneyAccountId: foreign.account.id } });
      try {
        await assert.rejects(act(record, refundPayment, {
          orderId: record.posPayment.orderId, paymentId: record.posPayment.id, amount: record.posAmount,
        }));
        assert.deepEqual(await snapshotOwned(record.store.id), beforeA);
        assert.deepEqual(await snapshotOwned(foreign.store.id), beforeB);
      } finally {
        await prisma.payment.update({ where: { id: record.posPayment.id }, data: { moneyAccountId: record.account.id } });
      }
      await prisma.moneyAccount.update({ where: { id: record.account.id }, data: { balance: 0 } });
      try {
        const beforeInsufficientBalance = await snapshotOwned(record.store.id);
        await assert.rejects(act(record, refundPayment, {
          orderId: record.posPayment.orderId, paymentId: record.posPayment.id, amount: record.posAmount,
        }), /Insufficient balance/);
        assert.deepEqual(await snapshotOwned(record.store.id), beforeInsufficientBalance,
          "Failed debit left a Refund or another partial financial write.");
        assert.deepEqual(await snapshotOwned(foreign.store.id), beforeB);
      } finally {
        await prisma.moneyAccount.update({ where: { id: record.account.id }, data: { balance: beforeA.accounts[0].balance } });
      }
      results.paymentRefund[`${record.label}InvalidRefunds`] = "foreign Order/Payment and over-refund rejected without writes";
      const refunded = await act(record, refundPayment, {
        orderId: record.posPayment.orderId, paymentId: record.posPayment.id, amount: record.posAmount,
        storeId: foreign.store.id,
      });
      assert.equal(refunded.refund.storeId, record.store.id);
      assert.equal(refunded.transaction.storeId, record.store.id);
      const after = await snapshotOwned(record.store.id);
      assert.equal(after.refunds, beforeA.refunds + 1);
      assert.equal(after.movements, beforeA.movements + 1);
      assert.equal(after.journals, beforeA.journals + 1);
      assert.equal(after.accounts[0].balance, beforeA.accounts[0].balance - record.posAmount);
      assert.deepEqual(await snapshotOwned(foreign.store.id), beforeB);
      results.paymentRefund[`${record.label}OwnRefund`] = "posted to own account, MoneyTransaction and Journal only";
    }

    for (const record of [a, b]) {
      const foreign = record === a ? b : a;
      const accountReport = await act(record, getMoneyManagement, { storeId: foreign.store.id });
      const ledgerReport = await act(record, getJournalEntries, { storeId: foreign.store.id });
      const dashboard = await act(record, getAccountingDashboard, { storeId: foreign.store.id });
      const purchases = await inRequest(`${record.hostname}:3000`, record.cookie, () => getProcurementSectionData("purchases", { storeId: foreign.store.id }));
      const expenses = await inRequest(`${record.hostname}:3000`, record.cookie, () => getProcurementSectionData("expenses", { storeId: foreign.store.id }));
      const supplierPayments = await inRequest(`${record.hostname}:3000`, record.cookie, () => getProcurementSectionData("payments", { storeId: foreign.store.id }));
      const sales = await act(record, getPosSales, { warehouseId: record.warehouse.id, storeId: foreign.store.id });
      for (const response of [accountReport, ledgerReport, dashboard, purchases, expenses, supplierPayments, sales]) {
        assert.equal(response.success, true, response.message);
      }
      assert(accountReport.data.allAccounts.every((row) => row.storeId === record.store.id));
      assert(accountReport.data.transactions.every((row) => row.storeId === record.store.id));
      assert(ledgerReport.data.every((row) => row.storeId === record.store.id));
      assert(dashboard.data.recentEntries.every((row) => row.storeId === record.store.id));
      assert(purchases.data.purchaseOrders.every((row) => row.storeId === record.store.id));
      assert(expenses.data.expenses.every((row) => row.storeId === record.store.id));
      assert(supplierPayments.data.payments.every((row) => row.storeId === record.store.id));
      assert(sales.data.every((row) => row.id !== foreign.posPayment.orderId));
      assert.equal(accountReport.data.report.liquidFunds, record === a ? 10 : 18);
      assert.equal(expenses.data.expenses.reduce((sum, row) => sum + row.amount, 0), record === a ? 1 : 2);
      assert.equal(supplierPayments.data.payments.reduce((sum, row) => sum + row.amount, 0), 1);
      results.reports[record.label] = "account, journal, profit/loss, purchase, expense, supplier-payment and POS queries exclude foreign Store; forged storeId ignored";
    }

    // The legacy User button must post the same financial refund atomically.
    const legacyAct = (record, action, ...input) =>
      inRequest(`${record.hostname}:3000`, record.legacyCookie, () => action(...input));
    for (const record of [a, b]) {
      record.legacyCookie = (await loginLegacy(record.hostname)).cookie;
      const restock = await act(record, adjustStock, form({ warehouseId: record.warehouse.id, variationId: record.variation.id, quantity: 1 }));
      assert.equal(restock.success, true, restock.message);
      const sale = await act(record, createPosSale, posForm(record.warehouse, record.variation, record.account));
      assert.equal(sale.success, true, sale.message);
      record.legacyOrderId = sale.data.orderId;
      await prisma.order.update({ where: { id: record.legacyOrderId, storeId: record.store.id }, data: { status: "REFUNDING" } });
    }
    for (const [own, foreign] of [[a, b], [b, a]]) {
      const beforeOwn = await snapshotOwned(own.store.id);
      const beforeForeign = await snapshotOwned(foreign.store.id);
      const wrongOrder = await legacyAct(own, processRefundAction, { orderId: foreign.legacyOrderId, storeId: own.store.id });
      assert.equal(wrongOrder.success, false);
      assert.deepEqual(await snapshotOwned(own.store.id), beforeOwn);
      assert.deepEqual(await snapshotOwned(foreign.store.id), beforeForeign);
      results.paymentRefund[`${own.label}LegacyCrossStore`] = "legacy User denied foreign Order without writes";
    }
    for (const record of [a, b]) {
      const before = await snapshotOwned(record.store.id);
      const forbiddenStatus = await legacyAct(record, updateOrderStatusAction, record.legacyOrderId, "REFUNDED");
      assert.equal(forbiddenStatus.success, false);
      await prisma.moneyAccount.update({ where: { id: record.account.id }, data: { balance: 0 } });
      try {
        const zeroBalance = await snapshotOwned(record.store.id);
        const failed = await legacyAct(record, processRefundAction, { orderId: record.legacyOrderId, trxId: `FAIL-${token}` });
        assert.equal(failed.success, false);
        assert.match(failed.message, /Insufficient balance/);
        assert.deepEqual(await snapshotOwned(record.store.id), zeroBalance);
        assert.equal((await prisma.order.findUnique({ where: { id: record.legacyOrderId } })).status, "REFUNDING");
      } finally {
        await prisma.moneyAccount.update({ where: { id: record.account.id }, data: { balance: before.accounts[0].balance } });
      }
      const posted = await legacyAct(record, processRefundAction, {
        orderId: record.legacyOrderId, trxId: `LEGACY-${token}`, storeId: record === a ? b.store.id : a.store.id,
      });
      assert.equal(posted.success, true, posted.message);
      assert.equal(posted.data.refund.storeId, record.store.id);
      assert.equal(posted.data.transaction.storeId, record.store.id);
      assert.equal((await prisma.order.findUnique({ where: { id: record.legacyOrderId } })).status, "REFUNDED");
      const after = await snapshotOwned(record.store.id);
      assert.equal(after.refunds, before.refunds + 1);
      assert.equal(after.movements, before.movements + 1);
      assert.equal(after.journals, before.journals + 1);
      assert.equal(after.accounts[0].balance, before.accounts[0].balance - record.posAmount);
      const retry = await legacyAct(record, processRefundAction, { orderId: record.legacyOrderId, trxId: `LEGACY-${token}` });
      assert.equal(retry.success, true);
      assert.equal(retry.data.duplicate, true);
      assert.deepEqual(await snapshotOwned(record.store.id), after);
      results.paymentRefund[`${record.label}LegacyUserRefund`] = "original account debited once; Order, Refund, MoneyTransaction and Journal atomic; retry idempotent";
    }

    const beforeFinanceAuthA = await snapshotOwned(a.store.id);
    const beforeFinanceAuthB = await snapshotOwned(b.store.id);
    const legacyRefund = await act(a, processRefundAction, { orderId: a.posPayment.orderId, method: "CASH" });
    assert.equal(legacyRefund.success, false, "StoreMember reached legacy status-only refund path");
    await prisma.storeRolePermission.delete({ where: { roleId_resource_action: { roleId: b.role.id, resource: "PAYMENT", action: "CREATE" } } });
    await assert.rejects(act(b, paymentActions.createPayment, {
      orderId: b.webOrder.id, paymentGatewayId: b.gateway.id, paymentMethod: "COD", amount: 1,
    }));
    await prisma.storeRolePermission.delete({ where: { roleId_resource_action: { roleId: b.role.id, resource: "REFUND", action: "CREATE" } } });
    await assert.rejects(act(b, refundPayment, { orderId: b.posPayment.orderId, paymentId: b.posPayment.id, amount: 1 }));
    assert.deepEqual(await snapshotOwned(a.store.id), beforeFinanceAuthA);
    assert.deepEqual(await snapshotOwned(b.store.id), beforeFinanceAuthB);
    results.authorization.financePermission = "payment and refund mutations rejected when permissions removed; legacy status-only refund unavailable to StoreMember";

    const beforeAuthA = await snapshotOwned(a.store.id);
    const beforeAuthB = await snapshotOwned(b.store.id);
    const crossHost = await act(a, createWarehouse, form({ code: `CROSS${token.slice(0, 6)}`, name: "Denied" }), b.hostname);
    assert.equal(crossHost.success, false);
    assert.equal((await inRequest(`${b.hostname}:3000`, a.cookie, () => getAdminAccess("POS", "CREATE", "pos"))).allowed, false);
    assert.deepEqual(await snapshotOwned(a.store.id), beforeAuthA);
    assert.deepEqual(await snapshotOwned(b.store.id), beforeAuthB);
    results.authorization.aMemberOnBHost = "rejected";
    const reverseHost = await act(b, createWarehouse, form({ code: `CROSSB${token.slice(0, 5)}`, name: "Denied" }), a.hostname);
    assert.equal(reverseHost.success, false);
    assert.equal((await inRequest(`${a.hostname}:3000`, b.cookie, () => getAdminAccess("POS", "CREATE", "pos"))).allowed, false);
    assert.deepEqual(await snapshotOwned(a.store.id), beforeAuthA);
    assert.deepEqual(await snapshotOwned(b.store.id), beforeAuthB);
    results.authorization.bMemberOnAHost = "rejected";
    const platformHost = await act(a, createWarehouse, form({ code: `PLAT${token.slice(0, 6)}`, name: "Denied" }), "localhost");
    assert.equal(platformHost.success, false);
    const unknownHost = await act(a, createWarehouse, form({ code: `UNKN${token.slice(0, 6)}`, name: "Denied" }), `unknown-${token}.localhost`);
    assert.equal(unknownHost.success, false);
    assert.equal((await inRequest("localhost:3000", a.cookie, () => getAdminAccess("POS", "CREATE", "pos"))).allowed, false);
    assert.equal((await inRequest(`unknown-${token}.localhost:3000`, a.cookie, () => getAdminAccess("POS", "CREATE", "pos"))).allowed, false);
    assert.deepEqual(await snapshotOwned(a.store.id), beforeAuthA);
    assert.deepEqual(await snapshotOwned(b.store.id), beforeAuthB);
    results.authorization.platformAndUnknownHost = "rejected";

    await prisma.storeMember.update({ where: { id: a.member.id }, data: { status: "INACTIVE" } });
    const inactive = await act(a, createWarehouse, form({ code: `INACT${token.slice(0, 5)}`, name: "Denied" }));
    assert.equal(inactive.success, false);
    assert.equal((await inRequest(`${a.hostname}:3000`, a.cookie, () => getAdminAccess("POS", "CREATE", "pos"))).allowed, false);
    assert.deepEqual(await snapshotOwned(a.store.id), beforeAuthA);
    results.authorization.inactiveMember = "rejected";
    await prisma.storeRolePermission.delete({ where: { roleId_resource_action: { roleId: b.role.id, resource: "WAREHOUSE", action: "CREATE" } } });
    const noPermission = await act(b, createWarehouse, form({ code: `NOPERM${token.slice(0, 4)}`, name: "Denied" }));
    assert.equal(noPermission.success, false);
    assert.deepEqual(await snapshotOwned(b.store.id), beforeAuthB);
    results.authorization.missingPermission = "rejected";
    await prisma.storeRolePermission.delete({ where: { roleId_resource_action: { roleId: b.role.id, resource: "POS", action: "CREATE" } } });
    assert.equal((await inRequest(`${b.hostname}:3000`, b.cookie, () => getAdminAccess("POS", "CREATE", "pos"))).allowed, false);
    const deniedPos = await act(b, createPosSale, posForm(b.warehouse, b.variation, b.account));
    assert.equal(deniedPos.success, false);
    assert.deepEqual(await snapshotOwned(b.store.id), beforeAuthB);
    results.authorization.missingPosPermission = "rejected before mutation";

    console.log(JSON.stringify(results, null, 2));
  } finally {
    await cleanup(baseline);
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
