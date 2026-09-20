// Development-only, DB-backed negative-path verification of the real Next route.
// Run with DEPLOYMENT_MODE=SAAS, PLATFORM_DOMAIN=localhost and Next on port 3919.
const assert = require("node:assert/strict");
const http = require("node:http");
const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

if (new URL(process.env.DATABASE_URL).pathname.slice(1) !== "shopzdv") {
  throw new Error("Refusing to use a database other than shopzdv.");
}
if (process.env.DEPLOYMENT_MODE !== "SAAS" || process.env.PLATFORM_DOMAIN !== "localhost") {
  throw new Error("SAAS/localhost process configuration is required.");
}

const db = new PrismaClient();
const run = `ssl8-${Date.now().toString(36)}-${process.pid}`;
const ids = { stores: [], domains: [], accounts: [], gateways: [], orders: [], payments: [] };

function callback(host, body, path = "/api/py/sslc/success") {
  return new Promise((resolve, reject) => {
    const encoded = new URLSearchParams(body).toString();
    const req = http.request({ hostname: "127.0.0.1", port: 3919,
      path, method: "POST", timeout: 120000,
      headers: { Host: `${host}:3919`, "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(encoded) } }, (res) => {
      res.resume();
      res.on("end", () => resolve(res.statusCode));
    });
    req.on("timeout", () => req.destroy(new Error("Callback timed out.")));
    req.on("error", reject);
    req.end(encoded);
  });
}

async function snapshot(store) {
  const [payments, orders, account, money, journals] = await Promise.all([
    db.payment.findMany({ where: { storeId: store.id }, select: { id: true, status: true } }),
    db.order.findMany({ where: { storeId: store.id }, select: { id: true, paymentStatus: true, paidAmount: true } }),
    db.moneyAccount.findUnique({ where: { id: store.accountId }, select: { balance: true } }),
    db.moneyTransaction.count({ where: { storeId: store.id } }),
    db.journalEntry.count({ where: { storeId: store.id } }),
  ]);
  return { payments, orders, balance: account.balance, money, journals };
}

async function cleanup() {
  await db.payment.deleteMany({ where: { id: { in: ids.payments } } });
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
    const { assertSSLcommerzVerifiedPayment } = await import("../backend/lib/payments/providers/sslcommerzValidation.mjs");
    const expected = { id: "payment-a", orderId: "order-a", order: { orderNo: "A-100" },
      transactionId: "txn-a", amount: 1200, currency: "BDT" };
    const verified = { status: "VALID", val_id: "validation-a", tran_id: "txn-a",
      amount: "1200.00", currency: "BDT", value_a: "A-100", value_c: "payment-a", value_d: "order-a" };
    assert.doesNotThrow(() => assertSSLcommerzVerifiedPayment(verified, expected, "validation-a"));
    for (const [name, change] of [
      ["lower amount", { amount: "1199.00" }], ["higher amount", { amount: "1201.00" }],
      ["malformed amount", { amount: "invalid" }], ["wrong currency", { currency: "USD" }],
      ["missing currency", { currency: undefined }], ["wrong transaction", { tran_id: "txn-b" }],
      ["missing transaction", { tran_id: undefined }], ["wrong order", { value_d: "order-b" }],
      ["wrong payment", { value_c: "payment-b" }], ["wrong order number", { value_a: "B-100" }],
      ["wrong validation ID", { val_id: "validation-b" }], ["failed status", { status: "FAILED" }],
    ]) {
      assert.throws(() => assertSSLcommerzVerifiedPayment({ ...verified, ...change }, expected, "validation-a"),
        /does not match/, name);
    }
    process.stdout.write("PASS provider-response validation guard (offline fixture, not live SSLCommerz)\n");
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
        name: `${run}-${label}`, code: "SSLCOMMERZ", adapterKey: "SSLCOMMERZ",
        isActive: true, moneyAccountId: account.id } });
      ids.gateways.push(gateway.id);
      const order = await db.order.create({ data: { storeId: store.id,
        orderNo: `${run}-${label}`, customerName: "Temporary SSL verifier",
        phoneNumber: "01700000000", email: "ssl-verifier@example.test",
        orderPrice: label === "a" ? 1200 : 8200, deliveryCharge: 0,
        deliveryAddress: "Temporary test address", paymentMethod: "ONLINE",
        selectedPaymentGatewayId: gateway.id, dueAmount: label === "a" ? 1200 : 8200, ttclid: "" } });
      ids.orders.push(order.id);
      const payment = await db.payment.create({ data: { storeId: store.id, orderId: order.id,
        paymentGatewayId: gateway.id, gateway: gateway.code, paymentMethod: "ONLINE",
        amount: label === "a" ? 1200 : 8200, status: "PENDING",
        transactionId: `${run}-${label}-txn` } });
      ids.payments.push(payment.id);
      stores.push({ id: store.id, accountId: account.id, host, order, payment });
    }
    const baseline = await Promise.all(stores.map(snapshot));
    const [a, b] = stores;
    const cases = [
      ["missing validation ID", a.host, { value_c: a.payment.id, tran_id: a.payment.transactionId }],
      ["missing transaction reference", a.host, { value_c: a.payment.id, val_id: "invalid" }],
      ["A payment on B hostname", b.host, { value_c: a.payment.id, tran_id: a.payment.transactionId, val_id: "invalid" }],
      ["B payment on A hostname", a.host, { value_c: b.payment.id, tran_id: b.payment.transactionId, val_id: "invalid" }],
      ["unknown hostname", `${run}-unknown.localhost`, { value_c: a.payment.id, tran_id: a.payment.transactionId, val_id: "invalid" }],
      ["platform hostname", "localhost", { value_c: a.payment.id, tran_id: a.payment.transactionId, val_id: "invalid" }],
      ["forged storeId", b.host, { value_c: a.payment.id, tran_id: a.payment.transactionId, val_id: "invalid", storeId: b.id }],
    ];
    for (const [name, host, body] of cases) {
      const status = await callback(host, body);
      assert.ok(status >= 300, `${name}: unexpected HTTP ${status}`);
      assert.deepEqual(await Promise.all(stores.map(snapshot)), baseline, `${name}: database mutated`);
      process.stdout.write(`PASS ${name}: no financial or payment mutation\n`);
    }
    for (const path of ["/api/py/sslc/fail", "/api/py/sslc/cancel"]) {
      for (const store of stores) {
        const body = { value_c: store.payment.id, tran_id: store.payment.transactionId,
          status: "FAILED", storeId: stores.find((other) => other.id !== store.id).id };
        const status = await callback(store.host, body, path);
        assert.ok(status >= 300, `${path}: unexpected HTTP ${status}`);
        assert.deepEqual(await Promise.all(stores.map(snapshot)), baseline, `${path}: database mutated`);
      }
      process.stdout.write(`PASS ${path}: forged browser return leaves payment pending\n`);
    }
  } finally {
    await cleanup();
    await db.$disconnect();
    process.stdout.write("PASS temporary SSLCommerz records cleaned up\n");
  }
}

main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
