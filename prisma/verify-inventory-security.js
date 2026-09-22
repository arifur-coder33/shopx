// Development-only Phase 11 verifier. Real StoreMember sessions, temporary
// Store A/B records, and cleanup are required; never run against production.
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { AsyncLocalStorage } = require("node:async_hooks");
const { registerHooks } = require("node:module");
const { fileURLToPath, pathToFileURL } = require("node:url");
const { PrismaClient } = require("@prisma/client");
const { STORE_PERMISSIONS } = require("./seed-identity-foundation.js");
require("dotenv/config");

if (new URL(process.env.DATABASE_URL || "mongodb://invalid/none").pathname.slice(1) !== "shopzdv") {
  throw new Error("Refusing inventory verification outside shopzdv.");
}
process.env.DEPLOYMENT_MODE = "SAAS";
process.env.PLATFORM_DOMAIN = "localhost";
process.env.STORE_AUTH_SECRET ||= randomUUID().replaceAll("-", "");
process.env.AUTH_SECRET ||= randomUUID().replaceAll("-", "");
globalThis.AsyncLocalStorage ??= AsyncLocalStorage;

const root = path.resolve(__dirname, "..");
const nextEntries = Object.fromEntries(["next/headers", "next/cache", "next/server", "next/navigation"]
  .map((name) => [name, pathToFileURL(require.resolve(name)).href]));
registerHooks({ resolve(specifier, context, nextResolve) {
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
} });

const { workAsyncStorage } = require("next/dist/server/app-render/work-async-storage.external.js");
const { workUnitAsyncStorage } = require("next/dist/server/app-render/work-unit-async-storage.external.js");
const db = new PrismaClient();
const run = `phase11-${randomUUID().slice(0, 12)}`;
const records = [];
const pass = (message) => process.stdout.write(`PASS ${message}\n`);
const form = (values) => {
  const result = new FormData();
  for (const [key, value] of Object.entries(values)) result.set(key, typeof value === "string" ? value : JSON.stringify(value));
  return result;
};
function inRequest(host, cookie, fn) {
  return workAsyncStorage.run({ route: "/phase11-inventory", incrementalCache: {} }, () =>
    workUnitAsyncStorage.run({ type: "request", headers: new Headers({ host, "x-forwarded-proto": "http", ...(cookie ? { cookie } : {}) }) }, fn));
}
const invoke = (record, action, values) => inRequest(`${record.host}:3000`, record.cookie, () => action(form({
  ...(action.name === "adjustStock" || action.name === "createGoodsReceipt" ? { operationId: randomUUID() } : {}), ...values,
})));
const stock = (record) => db.stock.findUnique({ where: { storeId_warehouseId_variationId: {
  storeId: record.store.id, warehouseId: record.warehouse.id, variationId: record.variation.id,
} } });
const movements = (record) => db.inventoryTransaction.findMany({ where: {
  storeId: record.store.id, warehouseId: record.warehouse.id, variationId: record.variation.id,
}, orderBy: { createdAt: "asc" } });

async function login(record, handlers, storeAuth) {
  const host = `${record.host}:3000`;
  const base = `http://${host}/api/store-auth`;
  const csrfResponse = await inRequest(host, "", () => handlers.GET(new Request(`${base}/csrf`, { headers: { host } })));
  const csrf = await csrfResponse.json();
  const csrfCookie = csrfResponse.headers.get("set-cookie")?.split(";")[0];
  assert.equal(csrfResponse.status, 200);
  assert(csrf.csrfToken && csrfCookie);
  const response = await inRequest(host, csrfCookie, () => handlers.POST(new Request(`${base}/callback/store-credentials`, {
    method: "POST", headers: { host, cookie: csrfCookie, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ csrfToken: csrf.csrfToken, email: record.email, password: record.password, callbackUrl: `http://${host}/` }),
  })));
  record.cookie = response.headers.getSetCookie().find((value) => value.startsWith("authjs.store.session-token="))?.split(";")[0];
  assert(record.cookie, `Store ${record.label}: genuine Auth.js login failed.`);
  const session = await inRequest(host, record.cookie, () => storeAuth());
  assert.equal(session?.user?.storeMemberId, record.member.id);
  assert.equal(session?.user?.storeId, record.store.id);
}

async function loginLegacy(host) {
  assert(process.env.SUPER_ADMIN_EMAIL && process.env.SUPER_ADMIN_PASSWORD, "Existing development legacy admin credentials are required for the delivery action test.");
  const { GET, POST, auth } = await import("../auth.js");
  const base = `http://${host}/api/auth`;
  const csrfResponse = await inRequest(host, "", () => GET(new Request(`${base}/csrf`, { headers: { host } })));
  const csrf = await csrfResponse.json();
  const csrfCookie = csrfResponse.headers.get("set-cookie")?.split(";")[0];
  assert(csrf.csrfToken && csrfCookie);
  const response = await inRequest(host, csrfCookie, () => POST(new Request(`${base}/callback/credentials`, {
    method: "POST", headers: { host, cookie: csrfCookie, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ csrfToken: csrf.csrfToken, email: process.env.SUPER_ADMIN_EMAIL,
      password: process.env.SUPER_ADMIN_PASSWORD, callbackUrl: `http://${host}/admin` }),
  })));
  const cookie = response.headers.getSetCookie().find((value) => value.startsWith("authjs.session-token="))?.split(";")[0];
  assert(cookie, `Existing legacy admin login failed (HTTP ${response.status}).`);
  const session = await inRequest(host, cookie, () => auth());
  assert.equal(session?.user?.role, "SUPER_ADMIN");
  return cookie;
}

async function setup(label, hashPassword, handlers, storeAuth) {
  const record = { label, host: `${run}-${label}.localhost`, email: `${run}-${label}@example.test`, password: `Temporary-${run}` };
  records.push(record);
  record.store = await db.store.create({ data: { name: `${run}-${label}`, slug: `${run}-${label}` } });
  await db.storeDomain.create({ data: { storeId: record.store.id, domain: record.host, type: "CUSTOM", status: "ACTIVE", isVerified: true, isPrimary: true } });
  record.role = await db.storeRole.create({ data: { storeId: record.store.id, name: "Owner", code: "OWNER" } });
  for (const [resource, action] of STORE_PERMISSIONS.OWNER) {
    await db.storeRolePermission.create({ data: { roleId: record.role.id, resource, action } });
  }
  record.member = await db.storeMember.create({ data: { storeId: record.store.id, name: `${run}-${label}`, email: record.email,
    normalizedEmail: record.email, passwordHash: await hashPassword(record.password), roleId: record.role.id } });
  await login(record, handlers, storeAuth);
  record.warehouse = await db.warehouse.create({ data: { storeId: record.store.id, code: "MAIN", name: `${run}-warehouse` } });
  record.product = await db.product.create({ data: { storeId: record.store.id, title: `${run}-${label}`, slug: `${run}-${label}`, isActive: true, status: "ACTIVE" } });
  record.variation = await db.productVariation.create({ data: { productId: record.product.id, sku: `${run}-${label}`, matcherId: `${run}-${label}`, regularPrice: 100 } });
  return record;
}

async function cleanup() {
  for (const record of records.reverse()) {
    if (!record.store) continue;
    const storeId = record.store.id;
    const roleId = record.role?.id;
    const orderIds = (await db.order.findMany({ where: { storeId }, select: { id: true } })).map((row) => row.id);
    const poIds = (await db.purchaseOrder.findMany({ where: { storeId }, select: { id: true } })).map((row) => row.id);
    const receiptIds = (await db.goodsReceipt.findMany({ where: { storeId }, select: { id: true } })).map((row) => row.id);
    await db.orderTimeline.deleteMany({ where: { orderId: { in: orderIds } } });
    await db.deliveryItem.deleteMany({ where: { delivery: { storeId } } });
    await db.delivery.deleteMany({ where: { storeId } });
    await db.shipping.deleteMany({ where: { storeId } });
    await db.payment.deleteMany({ where: { storeId } });
    await db.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await db.order.deleteMany({ where: { storeId } });
    await db.orderCounter.deleteMany({ where: { storeId } });
    await db.goodsReceiptItem.deleteMany({ where: { goodsReceiptId: { in: receiptIds } } });
    await db.goodsReceipt.deleteMany({ where: { storeId } });
    await db.inventoryTransaction.deleteMany({ where: { storeId } });
    await db.stock.deleteMany({ where: { storeId } });
    await db.purchaseItem.deleteMany({ where: { purchaseOrderId: { in: poIds } } });
    await db.purchaseOrder.deleteMany({ where: { storeId } });
    await db.counter.deleteMany({ where: { storeId } });
    await db.courierProvider.deleteMany({ where: { storeId } });
    await db.paymentGateway.deleteMany({ where: { storeId } });
    await db.supplier.deleteMany({ where: { storeId } });
    if (record.product?.id) await db.productVariation.deleteMany({ where: { productId: record.product.id } });
    if (record.extraProduct?.id) await db.productVariation.deleteMany({ where: { productId: record.extraProduct.id } });
    await db.product.deleteMany({ where: { storeId } });
    await db.warehouse.deleteMany({ where: { storeId } });
    await db.storeMember.deleteMany({ where: { storeId } });
    if (roleId) await db.storeRolePermission.deleteMany({ where: { roleId } });
    await db.storeRole.deleteMany({ where: { storeId } });
    await db.storeDomain.deleteMany({ where: { storeId } });
    await db.store.delete({ where: { id: storeId } });
  }
  assert.equal(await db.store.count({ where: { slug: { startsWith: run } } }), 0);
  assert.equal(await db.storeDomain.count({ where: { domain: { startsWith: run } } }), 0);
  assert.equal(await db.store.findUnique({ where: { slug: "default" }, select: { slug: true } }).then((value) => value?.slug), "default");
  pass("temporary Store A/B inventory and identities cleaned; default Store retained");
}

async function main() {
  const { hashPassword } = await import("../backend/utils/password.server.js");
  const { storeHandlers, storeAuth } = await import("../auth/store.js");
  const { adjustStock } = await import("../backend/serverActions/inventoryAction.js");
  const { createGoodsReceipt } = await import("../backend/serverActions/goodsReceiptAction.js");
  const { createPurchaseOrder } = await import("../backend/serverActions/purchaseAction.js");
  const { createOrder, deleteOrderById, updateOrderStatusAction } = await import("../backend/serverActions/orderActions.js");
  const { createDelivery } = await import("../backend/serverActions/deliveryAction.js");
  const { deleteProcurementRecord } = await import("../backend/serverActions/procurementDetailAction.js");
  const { deleteProductById } = await import("../backend/serverActions/productActions.js");
  try {
    const a = await setup("a", hashPassword, storeHandlers, storeAuth);
    const b = await setup("b", hashPassword, storeHandlers, storeAuth);
    const sharedAdjustmentId = randomUUID();
    for (const record of [a, b]) {
      const initialAdjustment = { warehouseId: record.warehouse.id, variationId: record.variation.id, quantity: 10, operationId: sharedAdjustmentId };
      const add = await invoke(record, adjustStock, initialAdjustment);
      assert.equal(add.success, true, add.message);
      assert.equal((await stock(record)).quantity, 10);
      const repeatAdd = await invoke(record, adjustStock, initialAdjustment);
      assert.equal(repeatAdd.success, true, repeatAdd.message);
      assert.equal(repeatAdd.data.id, add.data.id);
      assert.equal((await stock(record)).quantity, 10);
      assert.equal((await movements(record)).length, 1);
      const changedRetry = await invoke(record, adjustStock, { ...initialAdjustment, quantity: 9 });
      assert.equal(changedRetry.success, false);
      assert.equal((await stock(record)).quantity, 10);
      const subtract = await invoke(record, adjustStock, { warehouseId: record.warehouse.id, variationId: record.variation.id, quantity: -3 });
      assert.equal(subtract.success, true, subtract.message);
      assert.equal((await stock(record)).quantity, 7);
      const movementsAfter = await movements(record);
      assert.deepEqual(movementsAfter.map((row) => [row.quantity, row.balanceAfter, row.type]), [[10, 10, "ADJUSTMENT"], [-3, 7, "ADJUSTMENT"]]);
      const increase = await invoke(record, adjustStock, { warehouseId: record.warehouse.id, variationId: record.variation.id, quantity: 3 });
      assert.equal(increase.success, true, increase.message);
      assert.equal((await stock(record)).quantity, 10);
      assert.equal((await movements(record)).at(-1).balanceAfter, 10);
      pass(`Store ${record.label.toUpperCase()} valid decrement/increment and Store-owned ledger`);
    }
    assert.notEqual((await movements(a))[0].id, (await movements(b))[0].id);
    pass("same adjustment UUID is isolated by trusted Store; retries do not double-post");
    for (const [own, foreign] of [[a, b], [b, a]]) {
      const beforeOwn = await stock(own);
      const beforeForeign = await stock(foreign);
      for (const values of [
        { warehouseId: foreign.warehouse.id, variationId: own.variation.id, quantity: -1 },
        { warehouseId: own.warehouse.id, variationId: foreign.variation.id, quantity: -1 },
      ]) {
        const result = await invoke(own, adjustStock, values);
        assert.equal(result.success, false);
        assert.equal((await stock(own)).quantity, beforeOwn.quantity);
        assert.equal((await stock(foreign)).quantity, beforeForeign.quantity);
      }
      const wrongHost = await inRequest(`${foreign.host}:3000`, own.cookie, () => adjustStock(form({ warehouseId: foreign.warehouse.id, variationId: foreign.variation.id, quantity: -1, operationId: randomUUID() })));
      assert.equal(wrongHost.success, false);
      pass(`Store ${own.label.toUpperCase()} foreign IDs and wrong-host session rejected`);
    }
    const baseline = await movements(a);
    for (const quantity of [0, -11, 1.5, "NaN", "Infinity", "not-a-number", Number.MAX_SAFE_INTEGER + 1]) {
      const result = await invoke(a, adjustStock, { warehouseId: a.warehouse.id, variationId: a.variation.id, quantity });
      assert.equal(result.success, false, `Accepted invalid quantity ${quantity}`);
      assert.equal((await stock(a)).quantity, 10);
      assert.equal((await movements(a)).length, baseline.length);
    }
    pass("insufficient and malformed adjustments leave stock/ledger unchanged");
    const unauthenticated = await inRequest(`${a.host}:3000`, "", () => adjustStock(form({ warehouseId: a.warehouse.id, variationId: a.variation.id, quantity: -1, operationId: randomUUID() })));
    assert.equal(unauthenticated.success, false);
    assert.equal((await stock(a)).quantity, 10);
    pass("unauthenticated inventory mutation rejected");

    await db.stock.update({ where: { id: (await stock(a)).id }, data: { quantity: 1, available: 1 } });
    const parallel = await Promise.allSettled([1, 2].map(() => invoke(a, adjustStock, { warehouseId: a.warehouse.id, variationId: a.variation.id, quantity: -1 })));
    assert.equal(parallel.filter((row) => row.status === "fulfilled" && row.value.success).length, 1);
    assert.equal((await stock(a)).quantity, 0);
    assert.equal((await stock(a)).available, 0);
    assert.equal((await movements(a)).filter((row) => row.quantity === -1).length, 1);
    pass("concurrent stock 1 decrements once, never negative");

    const beforeRollback = await stock(b);
    const beforeLedger = (await movements(b)).length;
    await assert.rejects(db.$transaction(async (tx) => {
      await tx.stock.update({ where: { id: beforeRollback.id }, data: { quantity: { decrement: 1 }, available: { decrement: 1 } } });
      await tx.inventoryTransaction.create({ data: { storeId: b.store.id, warehouseId: b.warehouse.id, variationId: b.variation.id,
        type: "NOT_A_TYPE", quantity: -1, balanceAfter: 9, referenceType: "ADJUSTMENT" } });
    }));
    assert.equal((await stock(b)).quantity, beforeRollback.quantity);
    assert.equal((await movements(b)).length, beforeLedger);
    pass("controlled post-stock failure rolls back stock and movement");

    const supplier = await db.supplier.create({ data: { storeId: a.store.id, supplierCode: run, companyName: run } });
    const fractionalPo = await invoke(a, createPurchaseOrder, { supplierId: supplier.id,
      items: [{ productId: a.product.id, variationId: a.variation.id, quantity: 1.5, unitCost: 0, discount: 0 }] });
    assert.equal(fractionalPo.success, false);
    assert.equal(await db.purchaseOrder.count({ where: { storeId: a.store.id } }), 0);
    const po = await db.purchaseOrder.create({ data: { storeId: a.store.id, poNo: run, supplierId: supplier.id,
      status: "ORDERED", subtotal: 0, total: 0, dueAmount: 0,
      items: { create: [{ productId: a.product.id, variationId: a.variation.id, quantity: 2,
        unitCost: 0, discount: 0, total: 0 }] } } });
    const poItem = await db.purchaseItem.findFirst({ where: { purchaseOrderId: po.id } });
    assert(poItem);
    const receiptForm = (items) => ({ purchaseOrderId: po.id, warehouseId: a.warehouse.id, items });
    const sourceItem = { purchaseItemId: poItem.id, variationId: a.variation.id, quantity: 2, supplierLotNumber: run };
    for (const items of [[sourceItem, sourceItem], [{ ...sourceItem, quantity: 1.5 }], [{ ...sourceItem, quantity: "NaN" }]]) {
      const response = await invoke(a, createGoodsReceipt, receiptForm(items));
      assert.equal(response.success, false);
      assert.equal((await stock(a)).quantity, 0);
      assert.equal(await db.goodsReceipt.count({ where: { storeId: a.store.id } }), 0);
    }
    const receiptOperationId = randomUUID();
    const receiptInput = { ...receiptForm([sourceItem, { ...sourceItem, quantity: 0, supplierLotNumber: "" }]), operationId: receiptOperationId };
    const received = await invoke(a, createGoodsReceipt, receiptInput);
    assert.equal(received.success, true, received.message);
    assert.equal((await stock(a)).quantity, 2);
    const repeatedReceipt = await invoke(a, createGoodsReceipt, receiptInput);
    assert.equal(repeatedReceipt.success, true, repeatedReceipt.message);
    assert.equal(repeatedReceipt.data.id, received.data.id);
    assert.equal((await stock(a)).quantity, 2);
    assert.equal(await db.goodsReceipt.count({ where: { storeId: a.store.id } }), 1);
    const changedReceiptRetry = await invoke(a, createGoodsReceipt, { ...receiptInput, items: [{ ...sourceItem, quantity: 1 }] });
    assert.equal(changedReceiptRetry.success, false);
    assert.equal((await stock(a)).quantity, 2);
    const receiptMovement = (await movements(a)).find((row) => row.referenceType === "PURCHASE" && row.referenceId === received.data.id);
    assert.equal(receiptMovement.quantity, 2);
    assert.equal(receiptMovement.balanceAfter, 2);
    assert.equal(receiptMovement.storeId, a.store.id);
    pass("goods receipt rejects duplicate/invalid items and atomically posts stock plus movement");

    await db.paymentGateway.create({ data: { storeId: a.store.id, name: "Temporary COD", code: "COD", adapterKey: "COD", isActive: true } });
    const checkout = await inRequest(`${a.host}:3000`, "", () => createOrder(form({
      customerName: "Temporary Buyer", phoneNumber: "01700000000", email: "temporary@example.test",
      district: "Dhaka", thana: "Test", deliveryAddress: "Temporary address", deliveryArea: "outside-dhaka",
      paymentMethod: "COD", products: [{ id: a.product.id, title: "Temporary", quantity: 1,
        regularPrice: 1, variation: { id: a.variation.id } }], ttclid: "", storeId: b.store.id,
    })));
    assert.equal(checkout.success, true, checkout.error?.message || checkout.message);
    assert.equal((await stock(a)).quantity, 1);
    const checkoutMovements = (await movements(a)).filter((row) => row.referenceType === "SALE" && row.referenceId === checkout.data.id);
    assert.equal(checkoutMovements.length, 1);
    assert.equal(checkoutMovements[0].quantity, -1);
    const courier = await db.courierProvider.create({ data: { storeId: a.store.id, name: "Temporary Manual", code: "MANUAL", adapterKey: "MANUAL", isActive: true } });
    await db.shipping.create({ data: { storeId: a.store.id, orderId: checkout.data.id, courierProviderId: courier.id } });
    await db.order.update({ where: { id: checkout.data.id }, data: { status: "PROCESSING" } });
    const orderItem = await db.orderItem.findFirst({ where: { orderId: checkout.data.id } });
    const lot = await db.goodsReceiptItem.findFirst({ where: { goodsReceiptId: received.data.id } });
    const adminCookie = await loginLegacy(`${a.host}:3000`);
    const deleteAllocatedReceipt = await inRequest(`${a.host}:3000`, adminCookie, () => deleteProcurementRecord("receipts", received.data.id));
    assert.equal(deleteAllocatedReceipt.success, false);
    assert.equal((await stock(a)).quantity, 1);
    assert.equal(await db.goodsReceipt.count({ where: { id: received.data.id, storeId: a.store.id } }), 1);
    pass("receipt cannot be removed while its warehouse stock is allocated to active checkout");
    const deliveryInput = { orderId: checkout.data.id, warehouseId: a.warehouse.id,
      items: [{ orderItemId: orderItem.id, goodsReceiptItemId: lot.id, quantity: 1 }] };
    const delivery = await inRequest(`${a.host}:3000`, adminCookie, () => createDelivery(form(deliveryInput)));
    assert.equal(delivery.success, true, delivery.message);
    assert.equal((await stock(a)).quantity, 1, "Delivery debited checkout stock again.");
    assert.equal((await movements(a)).filter((row) => row.type === "OUT" && row.variationId === a.variation.id).length, 1);
    assert.equal((await db.goodsReceiptItem.findUnique({ where: { id: lot.id } })).deliveredQuantity, 1);
    const duplicateDelivery = await inRequest(`${a.host}:3000`, adminCookie, () => createDelivery(form(deliveryInput)));
    assert.equal(duplicateDelivery.success, false);
    assert.equal((await stock(a)).quantity, 1);
    const foreignDelivery = await inRequest(`${b.host}:3000`, adminCookie, () => createDelivery(form(deliveryInput)));
    assert.equal(foreignDelivery.success, false);
    assert.equal((await stock(b)).quantity, 10);
    pass("real delivery action does not double-debit checkout stock; repeat and foreign-host requests rejected");
    const unsafeDelete = await inRequest(`${a.host}:3000`, adminCookie, () => deleteOrderById(checkout.data.id));
    assert.equal(unsafeDelete.success, false);
    assert.equal((await stock(a)).quantity, 1);
    const lateCancellation = await inRequest(`${a.host}:3000`, adminCookie, () => updateOrderStatusAction(checkout.data.id, "CANCELLED", "Too late"));
    assert.equal(lateCancellation.success, false);
    assert.equal((await stock(a)).quantity, 1);
    const secondCheckout = await inRequest(`${a.host}:3000`, "", () => createOrder(form({
      customerName: "Temporary Buyer", phoneNumber: "01700000000", email: "temporary@example.test",
      district: "Dhaka", thana: "Test", deliveryAddress: "Temporary address", deliveryArea: "outside-dhaka",
      paymentMethod: "COD", products: [{ id: a.product.id, quantity: 1, variation: { id: a.variation.id } }], ttclid: "",
    })));
    assert.equal(secondCheckout.success, true, secondCheckout.error?.message || secondCheckout.message);
    assert.equal((await stock(a)).quantity, 0);
    const statusCancellation = await inRequest(`${a.host}:3000`, adminCookie, () => updateOrderStatusAction(secondCheckout.data.id, "CANCELLED", "Temporary test"));
    assert.equal(statusCancellation.success, true, statusCancellation.message);
    assert.equal((await stock(a)).quantity, 1);
    const repeatedCancellation = await inRequest(`${a.host}:3000`, adminCookie, () => updateOrderStatusAction(secondCheckout.data.id, "CANCELLED", "Temporary test"));
    assert.equal(repeatedCancellation.success, false);
    assert.equal((await stock(a)).quantity, 1);
    assert.equal((await movements(a)).filter((row) => row.referenceType === "RETURN" && row.referenceId === secondCheckout.data.id).length, 1);
    pass("status-based cancellation restores checkout stock once; order deletion cannot erase stock history");

    a.extraProduct = await db.product.create({ data: { storeId: a.store.id, title: `${run}-stocked`, slug: `${run}-stocked` } });
    const extraVariation = await db.productVariation.create({ data: { productId: a.extraProduct.id, sku: `${run}-stocked`, matcherId: `${run}-stocked` } });
    await db.stock.create({ data: { storeId: a.store.id, warehouseId: a.warehouse.id, variationId: extraVariation.id, quantity: 1, available: 1 } });
    await assert.rejects(inRequest(`${a.host}:3000`, "", () => deleteProductById(a.extraProduct.id)));
    const deleteStockedProduct = await inRequest(`${a.host}:3000`, adminCookie, () => deleteProductById(a.extraProduct.id));
    assert.equal(deleteStockedProduct.success, false);
    assert.equal(await db.stock.count({ where: { storeId: a.store.id, variationId: extraVariation.id } }), 1);
    pass("unauthenticated product deletion rejected; stocked variation cannot be deleted");

    const supplierB = await db.supplier.create({ data: { storeId: b.store.id, supplierCode: `${run}-b`, companyName: `${run}-b` } });
    const poB = await db.purchaseOrder.create({ data: { storeId: b.store.id, poNo: `${run}-b`, supplierId: supplierB.id,
      status: "ORDERED", subtotal: 0, total: 0, dueAmount: 0,
      items: { create: [{ productId: b.product.id, variationId: b.variation.id, quantity: 3,
        unitCost: 0, discount: 0, total: 0 }] } } });
    const poItemB = await db.purchaseItem.findFirst({ where: { purchaseOrderId: poB.id } });
    const receiptBInput = { purchaseOrderId: poB.id, warehouseId: b.warehouse.id,
      items: [{ purchaseItemId: poItemB.id, variationId: b.variation.id, quantity: 3, supplierLotNumber: `${run}-b` }], operationId: randomUUID() };
    const receiptB = await invoke(b, createGoodsReceipt, receiptBInput);
    assert.equal(receiptB.success, true, receiptB.message);
    assert.equal((await stock(b)).quantity, 13);
    const adminCookieB = await loginLegacy(`${b.host}:3000`);
    const reversedReceipt = await inRequest(`${b.host}:3000`, adminCookieB, () => deleteProcurementRecord("receipts", receiptB.data.id));
    assert.equal(reversedReceipt.success, true, reversedReceipt.message);
    assert.equal((await stock(b)).quantity, 10);
    const receiptMovements = (await movements(b)).filter((row) => row.referenceId === receiptB.data.id);
    assert.equal(receiptMovements.length, 2);
    assert.equal(receiptMovements.reduce((sum, row) => sum + row.quantity, 0), 0);
    assert.equal(receiptMovements.find((row) => row.type === "ADJUSTMENT").balanceAfter, 10);
    const repeatedReversal = await inRequest(`${b.host}:3000`, adminCookieB, () => deleteProcurementRecord("receipts", receiptB.data.id));
    assert.equal(repeatedReversal.success, false);
    assert.equal((await stock(b)).quantity, 10);
    pass("receipt deletion reverses stock once; repeated deletion cannot decrement again");
    const replayDeletedReceipt = await invoke(b, createGoodsReceipt, receiptBInput);
    assert.equal(replayDeletedReceipt.success, false);
    assert.equal((await stock(b)).quantity, 10);

    const partialPo = await db.purchaseOrder.create({ data: { storeId: b.store.id, poNo: `${run}-partial`, supplierId: supplierB.id,
      status: "ORDERED", subtotal: 0, total: 0, dueAmount: 0,
      items: { create: [{ productId: b.product.id, variationId: b.variation.id, quantity: 2,
        unitCost: 0, discount: 0, total: 0 }] } } });
    const partialItem = await db.purchaseItem.findFirst({ where: { purchaseOrderId: partialPo.id } });
    const partialInput = { purchaseOrderId: partialPo.id, warehouseId: b.warehouse.id,
      items: [{ purchaseItemId: partialItem.id, variationId: b.variation.id, quantity: 1, supplierLotNumber: `${run}-partial` }], operationId: randomUUID() };
    const partialFirst = await invoke(b, createGoodsReceipt, partialInput);
    assert.equal(partialFirst.success, true, partialFirst.message);
    assert.equal((await stock(b)).quantity, 11);
    const partialRetry = await invoke(b, createGoodsReceipt, partialInput);
    assert.equal(partialRetry.success, true, partialRetry.message);
    assert.equal(partialRetry.data.id, partialFirst.data.id);
    assert.equal((await stock(b)).quantity, 11);
    assert.equal((await db.purchaseItem.findUnique({ where: { id: partialItem.id } })).receivedQty, 1);
    const partialSecond = await invoke(b, createGoodsReceipt, { ...partialInput, operationId: randomUUID() });
    assert.equal(partialSecond.success, true, partialSecond.message);
    assert.equal((await stock(b)).quantity, 12);
    assert.equal((await db.purchaseItem.findUnique({ where: { id: partialItem.id } })).receivedQty, 2);
    pass("partial GRN retry posts once; a new operation can receive the remaining quantity");

    const concurrentId = randomUUID();
    const concurrentInput = { warehouseId: b.warehouse.id, variationId: b.variation.id, quantity: -1, operationId: concurrentId };
    const simultaneousRetries = await Promise.allSettled([invoke(b, adjustStock, concurrentInput), invoke(b, adjustStock, concurrentInput)]);
    assert(simultaneousRetries.some((row) => row.status === "fulfilled" && row.value.success));
    assert.equal((await stock(b)).quantity, 11);
    const settledRetry = await invoke(b, adjustStock, concurrentInput);
    assert.equal(settledRetry.success, true, settledRetry.message);
    assert.equal((await stock(b)).quantity, 11);
    assert.equal((await db.inventoryTransaction.findMany({ where: { storeId: b.store.id, id: settledRetry.data.id } })).length, 1);
    pass("concurrent identical adjustment requests create one movement; later retry is idempotent");
  } finally {
    await cleanup();
    await db.$disconnect();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
