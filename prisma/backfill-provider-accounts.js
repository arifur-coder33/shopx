const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

const providers = [
  { kind: "gateway", name: "SSLCommerz", code: "SSLCOMMERZ", adapterKey: "SSLCOMMERZ", accountType: "PAYMENT_GATEWAY" },
  { kind: "gateway", name: "bKash", code: "BKASH", adapterKey: "BKASH", accountType: "PAYMENT_GATEWAY" },
  { kind: "courier", name: "SteadFast", code: "STEADFAST", adapterKey: "STEADFAST", accountType: "COURIER" },
  { kind: "courier", name: "Pathao", code: "PATHAO", adapterKey: "PATHAO", accountType: "COURIER" },
];

const legacyTypes = {
  CASH: "CASH",
  BANK: "BANK",
  MOBILE_BANKING: "MOBILE_FINANCIAL",
  COURIER_RECEIVABLE: "COURIER",
};

const normalized = (value) => String(value || "").replace(/[^a-z0-9]/gi, "").toUpperCase();

async function main() {
  const report = {
    mode: apply ? "APPLY" : "DRY_RUN",
    accountTypeChanges: [],
    providerMappings: [],
    paymentMappings: 0,
    shippingMappings: 0,
    unmappedPaidPayments: [],
    warnings: [],
  };
  const accounts = await prisma.moneyAccount.findMany({
    select: { id: true, name: true, type: true, balance: true },
  });
  const originalType = new Map(accounts.map((account) => [account.id, account.type]));
  for (const account of accounts) {
    const nextType = legacyTypes[account.type];
    if (nextType && nextType !== account.type) {
      report.accountTypeChanges.push({ id: account.id, name: account.name, from: account.type, to: nextType });
      if (apply) await prisma.moneyAccount.update({ where: { id: account.id }, data: { type: nextType } });
      account.type = nextType;
    }
  }

  const accountForProvider = new Map();
  for (const definition of providers) {
    const exactNameMatches = accounts.filter(
      (account) => normalized(account.name) === normalized(definition.code),
    );
    const legacyMatches = accounts.filter(
      (account) => normalized(originalType.get(account.id)) === normalized(definition.code),
    );
    const matches = [...new Map([...exactNameMatches, ...legacyMatches].map((row) => [row.id, row])).values()];
    let account = matches.length === 1 ? matches[0] : null;
    if (matches.length > 1) {
      report.warnings.push(`${definition.code}: multiple possible MoneyAccounts; mapping was not guessed.`);
    }
    if (!matches.length) {
      report.warnings.push(
        `${definition.code}: no exact MoneyAccount match; no account was created. Enabling this provider from Admin will create or reuse one safely.`,
      );
    }
    accountForProvider.set(definition.code, account);
    report.providerMappings.push({
      provider: definition.code,
      moneyAccount: account ? `${account.name} (${account.id})` : null,
    });
    if (apply) {
      const model = definition.kind === "gateway" ? prisma.paymentGateway : prisma.courierProvider;
      const isActive = false;
      await model.upsert({
        where: { code: definition.code },
        update: {
          name: definition.name,
          adapterKey: definition.adapterKey,
          ...(account && { moneyAccountId: account.id }),
          isActive,
        },
        create: {
          name: definition.name,
          code: definition.code,
          adapterKey: definition.adapterKey,
          isActive,
          moneyAccountId: account?.id || null,
        },
      });
    }
  }

  const [gatewayRows, courierRows] = apply
    ? await Promise.all([prisma.paymentGateway.findMany(), prisma.courierProvider.findMany()])
    : [providers.filter((row) => row.kind === "gateway"), providers.filter((row) => row.kind === "courier")];
  const gatewayMap = new Map(gatewayRows.map((row) => [row.code, row]));
  const courierMap = new Map(courierRows.map((row) => [row.code, row]));
  const payments = await prisma.payment.findMany({
    select: { id: true, gateway: true, status: true, moneyAccountId: true, paymentGatewayId: true, courierProviderId: true },
  });
  for (const payment of payments) {
    const code = normalized(payment.gateway);
    const gateway = gatewayMap.get(code);
    const courier = courierMap.get(code);
    if (!gateway && !courier) {
      if (payment.status === "PAID" && !payment.moneyAccountId) report.unmappedPaidPayments.push({ paymentId: payment.id, gateway: payment.gateway });
      continue;
    }
    const account = accountForProvider.get(code);
    const data = {
      ...(gateway && { paymentGatewayId: gateway.id }),
      ...(courier && { courierProviderId: courier.id }),
      ...(payment.status === "PAID" && !payment.moneyAccountId && account && { moneyAccountId: account.id }),
    };
    report.paymentMappings += 1;
    if (apply) await prisma.payment.update({ where: { id: payment.id }, data });
    if (payment.status === "PAID" && !payment.moneyAccountId && !account) {
      report.unmappedPaidPayments.push({ paymentId: payment.id, gateway: payment.gateway });
    }
  }

  const shippings = await prisma.shipping.findMany({ select: { id: true, courierName: true, courierProviderId: true } });
  for (const shipping of shippings) {
    if (shipping.courierProviderId) continue;
    const courier = courierMap.get(normalized(shipping.courierName));
    if (!courier) continue;
    report.shippingMappings += 1;
    if (apply) await prisma.shipping.update({ where: { id: shipping.id }, data: { courierProviderId: courier.id } });
  }

  console.log(JSON.stringify(report, null, 2));
  if (!apply) console.log("Dry run only. Re-run with --apply after reviewing every warning and unmapped payment.");
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
