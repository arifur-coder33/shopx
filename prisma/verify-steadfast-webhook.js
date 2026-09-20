// Focused development-only, DB-backed verification of the real Next webhook.
// Run a separate Next server with DEPLOYMENT_MODE=SAAS,
// PLATFORM_DOMAIN=localhost and STEADFAST_BASE_URL=http://127.0.0.1:3918/api/v1.
const assert = require("node:assert/strict");
const http = require("node:http");
const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const databaseName = new URL(process.env.DATABASE_URL).pathname.slice(1);
if (databaseName !== "shopzdv") {
  throw new Error(`Refusing to use database ${databaseName || "(none)"}; expected shopzdv.`);
}

const prisma = new PrismaClient();
const runId = `phase7b-${Date.now().toString(36)}-${process.pid}`;
const records = { stores: [], domains: [], accounts: [], providers: [], orders: [], shippings: [] };
const results = [];
let statusChecks = 0;
let mockServer;

function webhook(hostname, token, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const request = http.request({
      hostname: "127.0.0.1",
      port: 3917,
      path: "/api/webhooks/steadfast",
      method: "POST",
      timeout: 120000,
      headers: {
        Host: `${hostname}:3917`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    }, (response) => {
      let text = "";
      response.on("data", (chunk) => { text += chunk; });
      response.on("end", () => resolve({ status: response.statusCode, body: text }));
    });
    request.on("timeout", () => request.destroy(new Error("Webhook request timed out.")));
    request.on("error", reject);
    request.end(payload);
  });
}

async function check(name, run) {
  try {
    await run();
    results.push({ name, result: "PASS" });
  } catch (error) {
    results.push({ name, result: "FAIL", detail: error.message });
  }
}

async function createOrder(store, suffix, amount) {
  const orderNo = `${runId}-${store.label}-${suffix}`;
  const order = await prisma.order.create({ data: {
    storeId: store.id,
    orderNo,
    customerName: "Temporary webhook verifier",
    phoneNumber: "01700000000",
    email: "webhook-verifier@example.test",
    orderPrice: amount,
    deliveryCharge: 0,
    deliveryAddress: "Temporary test address",
    paymentMethod: "COD",
    paymentStatus: "UNPAID",
    dueAmount: amount,
    status: "PROCESSING",
    ttclid: "",
  } });
  records.orders.push(order.id);
  return order;
}

async function createShipment(store, suffix, amount) {
  const order = await createOrder(store, suffix, amount);
  const cn = String(870000000 + records.shippings.length + 1);
  const shipping = await prisma.shipping.create({ data: {
    storeId: store.id,
    orderId: order.id,
    orderNo: order.orderNo,
    courierProviderId: store.providerId,
    courierName: "Steadfast test",
    cn,
    cod: amount,
  } });
  records.shippings.push(shipping.id);
  return { order, shipping, cn, invoice: order.orderNo,
    notification_type: "delivery_status", status: "delivered",
    updated_at: "2026-09-17 10:00:00" };
}

function event(shipment, overrides = {}) {
  return {
    notification_type: shipment.notification_type,
    consignment_id: Number(shipment.cn),
    invoice: shipment.invoice,
    status: shipment.status,
    cod_amount: shipment.shipping.cod,
    updated_at: shipment.updated_at,
    ...overrides,
  };
}

async function snapshot(store, orderId) {
  const [account, order, shipping, paymentRows, transactions, timelines] = await Promise.all([
    prisma.moneyAccount.findUnique({ where: { id: store.accountId } }),
    prisma.order.findUnique({ where: { id: orderId } }),
    prisma.shipping.findUnique({ where: { orderId } }),
    prisma.payment.findMany({ where: { orderId }, select: { id: true } }),
    prisma.moneyTransaction.count({ where: { storeId: store.id, payment: { orderId } } }),
    prisma.orderTimeline.count({ where: { orderId } }),
  ]);
  const journals = await prisma.journalEntry.count({ where: {
    storeId: store.id,
    referenceType: "CUSTOMER_PAYMENT",
    referenceId: { in: paymentRows.map((row) => row.id) },
  } });
  return {
    balance: account.balance,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paidAmount: order.paidAmount,
    dueAmount: order.dueAmount,
    codCollectedAmount: shipping.codCollectedAmount,
    payments: paymentRows.length, transactions, journals, timelines,
  };
}

async function cleanup(financialAccountsBefore) {
  const storeIds = records.stores;
  if (!storeIds.length) return;
  const journalEntries = await prisma.journalEntry.findMany({ where: { storeId: { in: storeIds } }, select: { id: true } });
  await prisma.journalLine.deleteMany({ where: { journalEntryId: { in: journalEntries.map((row) => row.id) } } });
  await prisma.journalEntry.deleteMany({ where: { storeId: { in: storeIds } } });
  await prisma.moneyTransaction.deleteMany({ where: { storeId: { in: storeIds } } });
  await prisma.ledger.deleteMany({ where: { orderId: { in: records.orders } } });
  await prisma.orderTimeline.deleteMany({ where: { orderId: { in: records.orders } } });
  await prisma.payment.deleteMany({ where: { storeId: { in: storeIds } } });
  await prisma.shipping.deleteMany({ where: { id: { in: records.shippings } } });
  await prisma.order.deleteMany({ where: { id: { in: records.orders } } });
  await prisma.courierProvider.deleteMany({ where: { id: { in: records.providers } } });
  await prisma.moneyAccount.deleteMany({ where: { id: { in: records.accounts } } });
  await prisma.counter.deleteMany({ where: { storeId: { in: storeIds } } });
  await prisma.storeDomain.deleteMany({ where: { id: { in: records.domains } } });
  await prisma.store.deleteMany({ where: { id: { in: storeIds } } });
  const after = await prisma.financialAccount.findMany({ select: { id: true } });
  const createdIds = after.map((row) => row.id).filter((id) => !financialAccountsBefore.has(id));
  if (createdIds.length) await prisma.financialAccount.deleteMany({ where: { id: { in: createdIds } } });
  assert.equal(await prisma.store.count({ where: { id: { in: storeIds } } }), 0);
  assert.equal(await prisma.storeDomain.count({ where: { id: { in: records.domains } } }), 0);
  assert.equal(await prisma.moneyTransaction.count({ where: { storeId: { in: storeIds } } }), 0);
  assert.equal(await prisma.journalEntry.count({ where: { storeId: { in: storeIds } } }), 0);
}

async function main() {
  const { encryptProviderCredentials } = await import("../backend/services/providerCredentialService.js");
  const financialAccountsBefore = new Set(
    (await prisma.financialAccount.findMany({ select: { id: true } })).map((row) => row.id),
  );
  mockServer = http.createServer((req, res) => {
    if (/^\/api\/v1\/status_by_cid\/\d+$/.test(req.url)) {
      statusChecks += 1;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: 200, delivery_status: "delivered" }));
      return;
    }
    res.writeHead(404).end();
  });
  await new Promise((resolve) => mockServer.listen(3918, "127.0.0.1", resolve));

  try {
    const stores = {};
    for (const label of ["a", "b"]) {
      const store = await prisma.store.create({ data: { name: `${runId}-${label}`, slug: `${runId}-${label}` } });
      records.stores.push(store.id);
      const hostname = `${runId}-${label}.localhost`;
      const domain = await prisma.storeDomain.create({ data: {
        storeId: store.id, domain: hostname, type: "CUSTOM", isPrimary: true, isVerified: true, status: "ACTIVE",
      } });
      records.domains.push(domain.id);
      const account = await prisma.moneyAccount.create({ data: {
        storeId: store.id, name: `Steadfast ${label}`, type: "COURIER", balance: 0, isActive: true,
      } });
      records.accounts.push(account.id);
      const token = `${runId}-${label}-webhook-token-very-long`;
      const provider = await prisma.courierProvider.create({ data: {
        storeId: store.id, name: "Steadfast", code: "STEADFAST", adapterKey: "STEADFAST",
        isActive: true, moneyAccountId: account.id,
        encryptedCredentials: encryptProviderCredentials({
          apiKey: `test-api-${label}`, secretKey: `test-secret-${label}`, webhookAuthToken: token,
        }),
        nonSecretConfig: { webhookEnabled: "true", supportsCod: "true" },
      } });
      records.providers.push(provider.id);
      stores[label] = { id: store.id, label, hostname, token, accountId: account.id, providerId: provider.id };
    }
    const a = stores.a;
    const b = stores.b;
    const aMain = await createShipment(a, "main", 1200);
    const bMain = await createShipment(b, "main", 9000);
    const aFailure = await createShipment(a, "failure", 500);
    const aConcurrent = await createShipment(a, "concurrent", 700);
    const aForeignAccount = await createShipment(a, "foreign-account", 400);
    const bForeignAccount = await createShipment(b, "foreign-account", 600);
    const bOrphan = await createOrder(b, "orphan", 300);
    const crossShipping = await prisma.shipping.create({ data: {
      storeId: a.id, orderId: bOrphan.id, orderNo: bOrphan.orderNo,
      courierProviderId: a.providerId, cn: "879999999", cod: 300,
    } });
    records.shippings.push(crossShipping.id);

    await check("webhook credentials encrypted and excluded from error responses", async () => {
      for (const store of [a, b]) {
        const provider = await prisma.courierProvider.findUnique({
          where: { id: store.providerId },
          select: { encryptedCredentials: true },
        });
        assert.ok(provider.encryptedCredentials);
        assert.ok(!provider.encryptedCredentials.includes(store.token));
        const denied = await webhook(store.hostname, "wrong-token", event(store === a ? aMain : bMain));
        assert.equal(denied.status, 401);
        assert.ok(!denied.body.includes(store.token));
      }
    });

    await check("correct Bearer and tracking update", async () => {
      const r = await webhook(a.hostname, a.token, event(aMain, { notification_type: "tracking_update", status: undefined }));
      assert.equal(r.status, 200, r.body);
      assert.equal((await snapshot(a, aMain.order.id)).transactions, 0);
    });
    await check("wrong, missing and cross-Store Bearer rejected without mutation", async () => {
      const beforeA = await snapshot(a, aMain.order.id);
      const beforeB = await snapshot(b, bMain.order.id);
      assert.equal((await webhook(a.hostname, "wrong-token", event(aMain))).status, 401);
      assert.equal((await webhook(a.hostname, null, event(aMain))).status, 401);
      assert.equal((await webhook(b.hostname, a.token, event(bMain))).status, 401);
      assert.deepEqual(await snapshot(a, aMain.order.id), beforeA);
      assert.deepEqual(await snapshot(b, bMain.order.id), beforeB);
    });
    await check("disabled, unknown and platform hostname rejected", async () => {
      const before = await snapshot(a, aMain.order.id);
      await prisma.courierProvider.update({ where: { id: a.providerId }, data: {
        nonSecretConfig: { webhookEnabled: "false", supportsCod: "true" },
      } });
      assert.equal((await webhook(a.hostname, a.token, event(aMain))).status, 401);
      await prisma.courierProvider.update({ where: { id: a.providerId }, data: {
        nonSecretConfig: { webhookEnabled: "true", supportsCod: "true" },
      } });
      assert.equal((await webhook(`${runId}-unknown.localhost`, a.token, event(aMain))).status, 404);
      assert.equal((await webhook("localhost", a.token, event(aMain))).status, 404);
      assert.deepEqual(await snapshot(a, aMain.order.id), before);
    });
    await check("Store isolation and forged storeId", async () => {
      const beforeB = await snapshot(b, bMain.order.id);
      assert.equal((await webhook(a.hostname, a.token, event(bMain, { storeId: b.id }))).status, 404);
      assert.equal((await webhook(b.hostname, b.token, event(aMain, { storeId: a.id }))).status, 404);
      assert.deepEqual(await snapshot(b, bMain.order.id), beforeB);
    });
    await check("consignment, invoice and cross-Store relation rejected", async () => {
      const beforeA = await snapshot(a, aMain.order.id);
      assert.equal((await webhook(a.hostname, a.token, event(aMain, { consignment_id: 999999999 }))).status, 404);
      assert.equal((await webhook(a.hostname, a.token, event(aMain, { invoice: "wrong-invoice" }))).status, 409);
      assert.equal((await webhook(a.hostname, a.token, {
        notification_type: "delivery_status", consignment_id: 879999999,
        invoice: bOrphan.orderNo, status: "delivered",
      })).status, 404);
      assert.deepEqual(await snapshot(a, aMain.order.id), beforeA);
      assert.equal((await prisma.payment.count({ where: { orderId: bOrphan.id } })), 0);
    });
    await check("cross-Store courier MoneyAccount mapping rejected", async () => {
      for (const [actor, foreign, shipment] of [
        [a, b, aForeignAccount],
        [b, a, bForeignAccount],
      ]) {
        const before = await snapshot(actor, shipment.order.id);
        const foreignBalance = (await prisma.moneyAccount.findUnique({ where: { id: foreign.accountId } })).balance;
        await prisma.courierProvider.update({
          where: { id: actor.providerId }, data: { moneyAccountId: foreign.accountId },
        });
        try {
          assert.equal((await webhook(actor.hostname, actor.token, event(shipment))).status, 500);
          assert.deepEqual(await snapshot(actor, shipment.order.id), before);
          assert.equal((await prisma.moneyAccount.findUnique({ where: { id: foreign.accountId } })).balance, foreignBalance);
        } finally {
          await prisma.courierProvider.update({
            where: { id: actor.providerId }, data: { moneyAccountId: actor.accountId },
          });
        }
      }
    });
    await check("Store A and B delivered, provider-verified financial posting", async () => {
      const callsBefore = statusChecks;
      assert.equal((await webhook(a.hostname, a.token, event(aMain))).status, 200);
      assert.equal((await webhook(b.hostname, b.token, event(bMain))).status, 200);
      assert.ok(statusChecks >= callsBefore + 2);
      const aState = await snapshot(a, aMain.order.id);
      const bState = await snapshot(b, bMain.order.id);
      assert.equal(aState.status, "DELIVERED");
      assert.equal(bState.status, "DELIVERED");
      assert.equal(aState.balance, 1200);
      assert.equal(bState.balance, 9000);
      assert.equal(aState.payments, 1);
      assert.equal(bState.payments, 1);
      assert.equal(aState.transactions, 1);
      assert.equal(bState.transactions, 1);
      assert.equal(aState.journals, 1);
      assert.equal(bState.journals, 1);
    });
    await check("identical and sequential replay does not repost", async () => {
      const before = await snapshot(a, aMain.order.id);
      assert.equal((await webhook(a.hostname, a.token, event(aMain))).status, 200);
      assert.equal((await webhook(a.hostname, a.token, event(aMain))).status, 200);
      assert.deepEqual(await snapshot(a, aMain.order.id), before);
    });
    await check("late lower status does not downgrade or reverse", async () => {
      const before = await snapshot(a, aMain.order.id);
      assert.equal((await webhook(a.hostname, a.token, event(aMain, { status: "pending", updated_at: "2026-09-17 11:00:00" }))).status, 200);
      const after = await snapshot(a, aMain.order.id);
      assert.equal(after.status, "DELIVERED");
      assert.equal(after.balance, before.balance);
      assert.equal(after.payments, before.payments);
      assert.equal(after.transactions, before.transactions);
      assert.equal(after.journals, before.journals);
    });
    await check("posting failure leaves no partial Order/Shipping/finance/timeline", async () => {
      await prisma.moneyAccount.update({ where: { id: a.accountId }, data: { isActive: false } });
      try {
        const before = await snapshot(a, aFailure.order.id);
        const callsBefore = statusChecks;
        assert.equal((await webhook(a.hostname, a.token, event(aFailure))).status, 500);
        assert.ok(statusChecks > callsBefore);
        assert.deepEqual(await snapshot(a, aFailure.order.id), before);
      } finally {
        await prisma.moneyAccount.update({ where: { id: a.accountId }, data: { isActive: true } });
      }
    });
    await check("concurrent duplicate delivery creates one financial posting", async () => {
      const [first, second] = await Promise.all([
        webhook(a.hostname, a.token, event(aConcurrent)),
        webhook(a.hostname, a.token, event(aConcurrent)),
      ]);
      assert.ok([first.status, second.status].includes(200), `${first.status}/${second.status}`);
      const state = await snapshot(a, aConcurrent.order.id);
      assert.equal(state.payments, 1);
      assert.equal(state.transactions, 1);
      assert.equal(state.journals, 1);
      assert.equal(state.codCollectedAmount, 700);
      assert.equal(state.balance, 1900);
    });
  } finally {
    await cleanup(financialAccountsBefore);
    await new Promise((resolve) => mockServer.close(resolve));
  }
  console.log(JSON.stringify({ database: databaseName, runId, statusChecks, results, cleanup: "PASS" }, null, 2));
  if (results.some((item) => item.result === "FAIL")) process.exitCode = 1;
}

main().catch(async (error) => {
  console.error(error.message);
  if (mockServer?.listening) await new Promise((resolve) => mockServer.close(resolve));
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
