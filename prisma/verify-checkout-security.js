// Development-only guest checkout verifier using the real server action and
// Next request context. Temporary records are removed in finally.
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { AsyncLocalStorage } = require("node:async_hooks");
const { registerHooks } = require("node:module");
const { fileURLToPath, pathToFileURL } = require("node:url");
const { PrismaClient } = require("@prisma/client");
require("dotenv/config");

if (new URL(process.env.DATABASE_URL).pathname.slice(1) !== "shopzdv") {
  throw new Error("Refusing a database other than shopzdv.");
}
process.env.DEPLOYMENT_MODE = "SAAS";
process.env.PLATFORM_DOMAIN = "localhost";
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
const run = `phase10a-${randomUUID().slice(0, 12)}`;
const stores = [];
const check = (name) => process.stdout.write(`PASS ${name}\n`);

function inRequest(host, fn) {
  return workAsyncStorage.run({ route: "/phase10a-checkout", incrementalCache: {} }, () =>
    workUnitAsyncStorage.run({ type: "request", headers: new Headers({ host }) }, fn));
}

function form(record, overrides = {}) {
  const values = {
    customerName: "Temporary Test", phoneNumber: "01700000000", email: "temporary@example.test",
    district: "Dhaka", thana: "Test", deliveryAddress: "Temporary address",
    deliveryArea: "outside-dhaka", paymentMethod: "COD", ttclid: "",
    products: JSON.stringify([{ id: record.product.id, title: "Forged title",
      quantity: 1, regularPrice: 1, discountPrice: 0, variation: { id: record.variation.id } }]),
    orderPrice: "1", deliveryCharge: "0", storeId: record.foreignStoreId || "forged",
    ...overrides,
  };
  const result = new FormData();
  for (const [key, value] of Object.entries(values)) result.set(key, value);
  return result;
}

async function state(record) {
  const [orders, payments, items, money, journals, inventory] = await Promise.all([
    db.order.count({ where: { storeId: record.store.id } }),
    db.payment.count({ where: { storeId: record.store.id } }),
    db.orderItem.count({ where: { order: { storeId: record.store.id } } }),
    db.moneyTransaction.count({ where: { storeId: record.store.id } }),
    db.journalEntry.count({ where: { storeId: record.store.id } }),
    db.inventoryTransaction.count({ where: { storeId: record.store.id } }),
  ]);
  return { orders, payments, items, money, journals, inventory };
}

async function cleanup() {
  for (const record of stores.reverse()) {
    const storeId = record.store.id;
    const orderIds = (await db.order.findMany({ where: { storeId }, select: { id: true } })).map((row) => row.id);
    await db.orderTimeline.deleteMany({ where: { orderId: { in: orderIds } } });
    await db.inventoryTransaction.deleteMany({ where: { storeId } });
    await db.payment.deleteMany({ where: { storeId } });
    await db.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await db.order.deleteMany({ where: { storeId } });
    await db.orderCounter.deleteMany({ where: { storeId } });
    await db.stock.deleteMany({ where: { storeId } });
    await db.productVariation.deleteMany({ where: { productId: record.product?.id } });
    await db.product.deleteMany({ where: { storeId } });
    await db.warehouse.deleteMany({ where: { storeId } });
    await db.paymentGateway.deleteMany({ where: { storeId } });
    await db.storeDomain.deleteMany({ where: { storeId } });
    await db.store.delete({ where: { id: storeId } });
  }
  assert.equal(await db.store.count({ where: { slug: { startsWith: run } } }), 0);
  assert.equal(await db.storeDomain.count({ where: { domain: { startsWith: run } } }), 0);
  assert.equal(await db.order.count({ where: { orderNo: { startsWith: run } } }), 0);
  assert.equal(await db.store.count({ where: { slug: "default" } }), 1);
  check("temporary data cleaned; default Store retained");
}

async function main() {
  const action = await import("../backend/serverActions/orderActions.js");
  try {
    for (const label of ["a", "b"]) {
      const store = await db.store.create({ data: { name: `${run}-${label}`, slug: `${run}-${label}` } });
      const record = { store, host: `${run}-${label}.localhost` };
      stores.push(record);
      record.domain = await db.storeDomain.create({ data: { storeId: store.id, domain: record.host,
        type: "CUSTOM", isVerified: true, isPrimary: true } });
      record.gateway = await db.paymentGateway.create({ data: { storeId: store.id,
        name: "Temporary COD", code: "COD", adapterKey: "COD", isActive: true } });
      record.warehouse = await db.warehouse.create({ data: { storeId: store.id,
        name: "Temporary warehouse", code: "MAIN", isDefault: true } });
      record.product = await db.product.create({ data: { storeId: store.id,
        title: `${run}-${label}`, slug: `${run}-${label}`, isActive: true,
        status: "ACTIVE", allowOutOfStockOrder: false } });
      record.variation = await db.productVariation.create({ data: {
        productId: record.product.id, sku: `${run}-${label}`, matcherId: `${run}-${label}`,
        regularPrice: label === "a" ? 500 : 9000, weight: 1,
      } });
      record.stock = await db.stock.create({ data: { storeId: store.id,
        warehouseId: record.warehouse.id, variationId: record.variation.id,
        quantity: 5, available: 5 } });
    }
    const [a, b] = stores;
    a.foreignStoreId = b.store.id;
    b.foreignStoreId = a.store.id;
    for (const record of stores) {
      const response = await inRequest(record.host, () => action.createOrder(form(record)));
      assert.equal(response.success, true, response.error);
      const order = await db.order.findUnique({ where: { id: response.data.id }, include: { orderItems: true, payments: true } });
      const expectedPrice = record === a ? 500 : 9000;
      assert.equal(order.storeId, record.store.id);
      assert.equal(order.orderPrice, expectedPrice);
      assert.equal(order.deliveryCharge, 120);
      assert.equal(order.dueAmount, expectedPrice + 120);
      assert.equal(order.paidAmount, 0);
      assert.equal(order.orderItems[0].price, expectedPrice);
      assert.equal(order.payments.length, 1);
      assert.equal(order.payments[0].status, "PENDING");
    assert.equal(order.payments[0].amount, expectedPrice + 120);
    assert.equal((await db.stock.findUnique({ where: { id: record.stock.id } })).available, 4);
    assert.equal(await db.inventoryTransaction.count({ where: { storeId: record.store.id, referenceType: "SALE", referenceId: order.id } }), 1);
      check(`Store ${record === a ? "A" : "B"} guest checkout: server price, fee, total, pending payment`);
    }
    const baseline = await state(a);
    const cases = [
      ["zero quantity", { products: JSON.stringify([{ quantity: 0, variation: { id: a.variation.id } }]) }],
      ["negative quantity", { products: JSON.stringify([{ quantity: -1, variation: { id: a.variation.id } }]) }],
      ["fractional quantity", { products: JSON.stringify([{ quantity: 1.5, variation: { id: a.variation.id } }]) }],
      ["malformed quantity", { products: JSON.stringify([{ quantity: "abc", variation: { id: a.variation.id } }]) }],
      ["huge quantity", { products: JSON.stringify([{ quantity: 1001, variation: { id: a.variation.id } }]) }],
      ["insufficient stock", { products: JSON.stringify([{ quantity: 6, variation: { id: a.variation.id } }]) }],
      ["foreign variation", { products: JSON.stringify([{ quantity: 1, variation: { id: b.variation.id } }]) }],
      ["wrong product for variation", { products: JSON.stringify([{ id: b.product.id, quantity: 1, variation: { id: a.variation.id } }]) }],
      ["unknown variation", { products: JSON.stringify([{ quantity: 1, variation: { id: "000000000000000000000000" } }]) }],
      ["bad phone", { phoneNumber: "abc" }], ["bad email", { email: "not-an-email" }],
      ["bad delivery area", { deliveryArea: "unexpected" }],
      ["foreign gateway", { paymentMethod: "ONLINE", paymentGatewayId: b.gateway.id }],
    ];
    for (const [name, overrides] of cases) {
      const result = await inRequest(a.host, () => action.createOrder(form(a, overrides)));
      assert.equal(result.success, false, `${name}: unexpectedly accepted`);
      assert.deepEqual(await state(a), baseline, `${name}: partial order/payment write`);
      check(`${name}: rejected without partial write`);
    }
    const bStockBefore = (await db.stock.findUnique({ where: { id: b.stock.id } })).available;
    const bUsingA = await inRequest(b.host, () => action.createOrder(form(b, {
      products: JSON.stringify([{ id: a.product.id, quantity: 1, variation: { id: a.variation.id } }]),
    })));
    assert.equal(bUsingA.success, false);
    assert.equal((await db.stock.findUnique({ where: { id: b.stock.id } })).available, bStockBefore);
    assert.equal((await db.stock.findUnique({ where: { id: a.stock.id } })).available, 4);
    check("B checkout cannot consume A variation or either Store's stock");
    await db.product.update({ where: { id: a.product.id }, data: { isActive: false } });
    const inactive = await inRequest(a.host, () => action.createOrder(form(a)));
    assert.equal(inactive.success, false);
    assert.deepEqual(await state(a), baseline);
    check("inactive product rejected");
    await db.product.update({ where: { id: a.product.id }, data: { isActive: true } });
    for (const status of ["DRAFT", "DELETED"]) {
      await db.product.update({ where: { id: a.product.id }, data: { status } });
      const unavailable = await inRequest(a.host, () => action.createOrder(form(a)));
      assert.equal(unavailable.success, false);
      assert.deepEqual(await state(a), baseline);
      check(`${status} product rejected`);
    }
    await db.product.update({ where: { id: a.product.id }, data: { status: "ACTIVE" } });
    await db.stock.update({ where: { id: a.stock.id }, data: { quantity: 0, available: 0 } });
    const zeroStockAfterConsumption = await inRequest(a.host, () => action.createOrder(form(a)));
    assert.equal(zeroStockAfterConsumption.success, false);
    assert.deepEqual(await state(a), baseline);
    check("zero stock rejected");
    await db.stock.update({ where: { id: a.stock.id }, data: { quantity: 5, available: 5 } });
    const orderA = await db.order.findFirst({ where: { storeId: a.store.id } });
    const noPhone = await inRequest(a.host, () => action.getOrderByOrderNo({ orderId: orderA.id }));
    assert.equal(noPhone.success, false);
    const foreignOrder = await inRequest(b.host, () => action.getOrderByOrderNo({ orderId: orderA.id, phoneNumber: orderA.phoneNumber }));
    assert.equal(foreignOrder.data, null);
    const unauthorizedStatus = await inRequest(a.host, () => action.updateOrderStatusAction(orderA.id, "DELIVERED"));
    assert.equal(unauthorizedStatus.success, false);
    assert.equal((await db.order.findUnique({ where: { id: orderA.id } })).status, "PENDING");
    check("public order lookup and unauthenticated privileged status protection");
    await db.stock.update({ where: { id: a.stock.id }, data: { quantity: 1, available: 1 } });
    const insufficient = await inRequest(a.host, () => action.createOrder(form(a, {
      products: JSON.stringify([{ id: a.product.id, quantity: 2, variation: { id: a.variation.id } }]),
    })));
    assert.equal(insufficient.success, false);
    assert.equal((await db.stock.findUnique({ where: { id: a.stock.id } })).available, 1);
    check("stock 1 / quantity 2 rejected without debit");
    const beforeRollback = await state(a);
    const invalidAfterDebit = await inRequest(a.host, () => action.createOrder(form(a, {
      products: JSON.stringify([{ id: a.product.id, quantity: 1, thumbnail: { invalid: true }, variation: { id: a.variation.id } }]),
    })));
    assert.equal(invalidAfterDebit.success, false);
    assert.deepEqual(await state(a), beforeRollback);
    assert.equal((await db.stock.findUnique({ where: { id: a.stock.id } })).available, 1);
    check("failure after stock debit rolls back order, inventory and stock");
    const concurrent = await Promise.all([
      inRequest(a.host, () => action.createOrder(form(a))),
      inRequest(a.host, () => action.createOrder(form(a))),
    ]);
    const accepted = concurrent.filter((result) => result.success).length;
    const available = (await db.stock.findUnique({ where: { id: a.stock.id } })).available;
    assert.equal(accepted, 1);
    assert.equal(available, 0);
    check("concurrent stock 1: exactly one order consumes stock, final available 0");
    await db.stock.update({ where: { id: a.stock.id }, data: { quantity: 1, available: 1 } });
    const repeated = [
      await inRequest(a.host, () => action.createOrder(form(a))),
      await inRequest(a.host, () => action.createOrder(form(a))),
    ];
    assert.equal(repeated.filter((result) => result.success).length, 1);
    assert.equal((await db.stock.findUnique({ where: { id: a.stock.id } })).available, 0);
    check("sequential checkout cannot consume stock twice");
    await db.stock.update({ where: { id: a.stock.id }, data: { quantity: 0, available: 0 } });
    const zeroStock = await inRequest(a.host, () => action.createOrder(form(a)));
    assert.equal(zeroStock.success, false);
    assert.equal((await db.stock.findUnique({ where: { id: a.stock.id } })).available, 0);
    check("zero stock rejected");
    await db.stock.update({ where: { id: a.stock.id }, data: { quantity: 5, available: 5 } });
    const qtyThree = await inRequest(a.host, () => action.createOrder(form(a, {
      products: JSON.stringify([{ id: a.product.id, quantity: 3, variation: { id: a.variation.id } }]),
    })));
    assert.equal(qtyThree.success, true, qtyThree.error);
    assert.equal((await db.stock.findUnique({ where: { id: a.stock.id } })).available, 2);
    check("stock 5 / quantity 3 succeeds and leaves 2");
    const cancelled = await inRequest(a.host, () => action.cancelUnpaidCustomerOrder({
      orderNo: qtyThree.data.orderNo, phoneNumber: "01700000000", reason: "Temporary verifier cancellation",
    }));
    assert.equal(cancelled.success, true, cancelled.message);
    assert.equal((await db.stock.findUnique({ where: { id: a.stock.id } })).available, 5);
    assert.equal(await db.inventoryTransaction.count({ where: {
      storeId: a.store.id, referenceType: "RETURN", referenceId: qtyThree.data.id,
      type: "RETURN_IN", createdBy: "checkout-cancel",
    } }), 1);
    const cancelAgain = await inRequest(a.host, () => action.cancelUnpaidCustomerOrder({
      orderNo: qtyThree.data.orderNo, phoneNumber: "01700000000",
    }));
    assert.equal(cancelAgain.success, true);
    assert.equal((await db.stock.findUnique({ where: { id: a.stock.id } })).available, 5);
    check("unpaid cancellation restores stock exactly once");
  } finally {
    await cleanup();
    await db.$disconnect();
  }
}

main().catch((error) => { process.stderr.write(`${error.stack || error}\n`); process.exitCode = 1; });
