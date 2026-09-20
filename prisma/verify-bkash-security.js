// Focused negative-path verification of the real Next bKash callback.
// Run against Next on port 3921 with process-only SAAS/localhost settings.
const assert = require("node:assert/strict");
const http = require("node:http");
const { randomUUID } = require("node:crypto");
const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

if (new URL(process.env.DATABASE_URL).pathname.slice(1) !== "shopzdv") {
  throw new Error("Refusing a database other than shopzdv.");
}
if (process.env.DEPLOYMENT_MODE !== "SAAS" || process.env.PLATFORM_DOMAIN !== "localhost") {
  throw new Error("SAAS/localhost process configuration is required.");
}
const db = new PrismaClient();
const run = `bkash9-${randomUUID().slice(0, 12)}`;
const ids = { stores: [], domains: [], accounts: [], gateways: [], orders: [], payments: [] };

function callback(host, params) {
  return new Promise((resolve, reject) => {
    const path = `/api/py/bkash/callback?${new URLSearchParams(params)}`;
    const req = http.request({ hostname: "127.0.0.1", port: 3921, path,
      headers: { Host: `${host}:3921` }, timeout: 120000 }, (res) => {
      res.resume();
      res.on("end", () => resolve(res.statusCode));
    });
    req.on("timeout", () => req.destroy(new Error("Callback timed out.")));
    req.on("error", reject);
    req.end();
  });
}

async function snapshot(stores) {
  return Promise.all(stores.map(async (store) => {
    const [payment, order, account, transactions, journals, timelines] = await Promise.all([
      db.payment.findUnique({ where: { id: store.paymentId }, select: { status: true, transactionId: true, externalEventId: true } }),
      db.order.findUnique({ where: { id: store.orderId }, select: { paymentStatus: true, paidAmount: true } }),
      db.moneyAccount.findUnique({ where: { id: store.accountId }, select: { balance: true } }),
      db.moneyTransaction.count({ where: { storeId: store.id } }),
      db.journalEntry.count({ where: { storeId: store.id } }),
      db.orderTimeline.count({ where: { orderId: store.orderId } }),
    ]);
    return { payment, order, balance: account.balance, transactions, journals, timelines };
  }));
}

async function cleanup() {
  await db.payment.deleteMany({ where: { id: { in: ids.payments } } });
  await db.orderTimeline.deleteMany({ where: { orderId: { in: ids.orders } } });
  await db.order.deleteMany({ where: { id: { in: ids.orders } } });
  await db.paymentGateway.deleteMany({ where: { id: { in: ids.gateways } } });
  await db.moneyAccount.deleteMany({ where: { id: { in: ids.accounts } } });
  await db.storeDomain.deleteMany({ where: { id: { in: ids.domains } } });
  await db.store.deleteMany({ where: { id: { in: ids.stores } } });
  for (const [model, values] of [[db.payment, ids.payments], [db.order, ids.orders],
    [db.moneyAccount, ids.accounts], [db.storeDomain, ids.domains], [db.store, ids.stores]]) {
    assert.equal(await model.count({ where: { id: { in: values } } }), 0);
  }
}

async function main() {
  try {
    const { assertBkashExecutedPayment } = await import("../backend/lib/payments/providers/bkashValidation.mjs");
    const payment = { id: "payment-a", amount: 1200, currency: "BDT" };
    const executed = { paymentID: "bkash-a", transactionStatus: "Completed", trxID: "trx-a",
      merchantInvoiceNumber: payment.id, amount: "1200.00", currency: "BDT" };
    assert.doesNotThrow(() => assertBkashExecutedPayment(executed, payment, "bkash-a"));
    for (const [name, change] of [
      ["lower amount", { amount: "1199.00" }], ["higher amount", { amount: "1201.00" }],
      ["malformed amount", { amount: "invalid" }], ["wrong currency", { currency: "USD" }],
      ["missing currency", { currency: undefined }], ["wrong payment ID", { paymentID: "bkash-b" }],
      ["missing payment ID", { paymentID: undefined }], ["wrong invoice", { merchantInvoiceNumber: "payment-b" }],
      ["incomplete state", { transactionStatus: "Initiated" }], ["missing transaction", { trxID: undefined }],
    ]) {
      assert.throws(() => assertBkashExecutedPayment({ ...executed, ...change }, payment, "bkash-a"),
        /does not match/, name);
    }
    process.stdout.write("PASS Execute-response guard (offline fixture; not provider success)\n");

    const stores = [];
    for (const label of ["a", "b"]) {
      const store = await db.store.create({ data: { name: `${run}-${label}`, slug: `${run}-${label}` } });
      ids.stores.push(store.id);
      const host = `${run}-${label}.localhost`;
      const domain = await db.storeDomain.create({ data: { storeId: store.id, domain: host,
        type: "CUSTOM", isPrimary: true, isVerified: true } });
      ids.domains.push(domain.id);
      const account = await db.moneyAccount.create({ data: { storeId: store.id,
        name: `${run}-${label}`, type: "PAYMENT_GATEWAY", balance: label === "a" ? 100 : 900 } });
      ids.accounts.push(account.id);
      const gateway = await db.paymentGateway.create({ data: { storeId: store.id,
        name: "Temporary bKash", code: "BKASH", adapterKey: "BKASH",
        isActive: true, moneyAccountId: account.id } });
      ids.gateways.push(gateway.id);
      const amount = label === "a" ? 1200 : 8200;
      const order = await db.order.create({ data: { storeId: store.id,
        orderNo: `${run}-${label}`, customerName: "Temporary bKash verifier",
        phoneNumber: "01700000000", email: "bkash-verifier@example.test",
        orderPrice: amount, deliveryCharge: 0, deliveryAddress: "Temporary test address",
        paymentMethod: "ONLINE", selectedPaymentGatewayId: gateway.id, dueAmount: amount, ttclid: "" } });
      ids.orders.push(order.id);
      const paymentID = `${run}-${label}-pid`;
      const attempt = await db.payment.create({ data: { storeId: store.id, orderId: order.id,
        paymentGatewayId: gateway.id, gateway: "BKASH", paymentMethod: "ONLINE",
        amount, status: "PENDING", externalEventId: paymentID } });
      ids.payments.push(attempt.id);
      stores.push({ id: store.id, host, accountId: account.id,
        orderId: order.id, paymentId: attempt.id, providerPaymentId: paymentID });
    }
    const baseline = await snapshot(stores);
    const [a, b] = stores;
    if (process.argv.includes("--db-only")) {
      for (const [current, foreign] of [[a, b], [b, a]]) {
        const own = await db.payment.findFirst({ where: {
          storeId: current.id, externalEventId: current.providerPaymentId,
        }, include: { order: true, paymentGateway: true } });
        const cross = await db.payment.findFirst({ where: {
          storeId: current.id, externalEventId: foreign.providerPaymentId,
        } });
        assert.equal(own?.id, current.paymentId);
        assert.equal(own.order.storeId, current.id);
        assert.equal(own.paymentGateway.storeId, current.id);
        assert.equal(cross, null);
        assert.equal(await db.moneyAccount.count({ where: { id: foreign.accountId, storeId: current.id } }), 0);
      }
      assert.deepEqual(await snapshot(stores), baseline);
      process.stdout.write("PASS A/B Store-scoped bKash payment, order, gateway and account DB lookups\n");
      return;
    }
    const cases = [
      ["missing payment ID", a.host, { status: "success" }],
      ["unknown payment ID", a.host, { paymentID: "unknown", status: "success" }],
      ["A payment on B hostname", b.host, { paymentID: a.providerPaymentId, status: "success" }],
      ["B payment on A hostname", a.host, { paymentID: b.providerPaymentId, status: "success" }],
      ["unknown hostname", `${run}-unknown.localhost`, { paymentID: a.providerPaymentId, status: "success" }],
      ["platform hostname", "localhost", { paymentID: a.providerPaymentId, status: "success" }],
      ["forged storeId", b.host, { paymentID: a.providerPaymentId, status: "success", storeId: b.id }],
      ["forged cancel", a.host, { paymentID: a.providerPaymentId, status: "cancel" }],
      ["forged fail", b.host, { paymentID: b.providerPaymentId, status: "failure" }],
      ["success without provider credentials", a.host, { paymentID: a.providerPaymentId, status: "success" }],
    ];
    for (const [name, host, params] of cases) {
      const status = await callback(host, params);
      assert.ok(status >= 300, `${name}: unexpected HTTP ${status}`);
      assert.deepEqual(await snapshot(stores), baseline, `${name}: database mutated`);
      process.stdout.write(`PASS ${name}: no payment or financial mutation\n`);
    }
  } finally {
    await cleanup();
    await db.$disconnect();
    process.stdout.write("PASS temporary bKash records cleaned up\n");
  }
}

main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
