const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const { getProviderRuntimeConfiguration } = await import(
    "../backend/services/providerCredentialService.js"
  );
  const [gateways, couriers, payments, journals] = await Promise.all([
    prisma.paymentGateway.findMany({ where: { isActive: true } }),
    prisma.courierProvider.findMany({ where: { isActive: true } }),
    prisma.payment.findMany({
      select: {
        id: true,
        status: true,
        paymentMethod: true,
        moneyAccountId: true,
        moneyTransactions: { where: { type: "CUSTOMER_PAYMENT" }, select: { id: true, toAccountId: true } },
      },
    }),
    prisma.journalEntry.findMany({
      where: { status: "POSTED" },
      select: { entryNo: true, referenceType: true, referenceId: true, lines: { select: { debit: true, credit: true } } },
    }),
  ]);
  const failures = [];
  for (const [kind, providers] of [["gateway", gateways], ["courier", couriers]]) {
    for (const provider of providers) {
      const runtime = getProviderRuntimeConfiguration(kind, provider);
      if (runtime.moneyAccountRequired && !provider.moneyAccountId) {
        failures.push(`Active ${kind} ${provider.code} requires a MoneyAccount mapping.`);
      }
    }
  }
  const unbalanced = journals.filter((entry) => {
    const debit = entry.lines.reduce((sum, line) => sum + line.debit, 0);
    const credit = entry.lines.reduce((sum, line) => sum + line.credit, 0);
    return Math.abs(debit - credit) > 0.001;
  });
  failures.push(...unbalanced.map((entry) => `Journal ${entry.entryNo} is not balanced.`));
  for (const payment of payments) {
    const posted = ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"].includes(payment.status);
    if (posted && !payment.moneyAccountId) failures.push(`Posted payment ${payment.id} has no historical MoneyAccount snapshot.`);
    if (posted && payment.moneyTransactions.length !== 1) failures.push(`Posted payment ${payment.id} must have exactly one customer MoneyTransaction.`);
    if (posted && payment.moneyTransactions[0]?.toAccountId !== payment.moneyAccountId) failures.push(`Posted payment ${payment.id} MoneyTransaction account does not match its snapshot.`);
    if (!posted && payment.moneyTransactions.length) failures.push(`Unposted payment ${payment.id} changed a MoneyAccount.`);
  }
  const paymentJournalIds = new Set(journals.filter((entry) => entry.referenceType === "CUSTOMER_PAYMENT").map((entry) => entry.referenceId));
  for (const payment of payments.filter((row) => ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"].includes(row.status))) {
    if (!paymentJournalIds.has(payment.id)) failures.push(`Posted payment ${payment.id} has no customer payment journal.`);
  }
  const report = {
    activeGateways: gateways.length,
    activeCouriers: couriers.length,
    paymentsChecked: payments.length,
    postedPaymentsChecked: payments.filter((row) => ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"].includes(row.status)).length,
    postedJournalsChecked: journals.length,
    failures,
  };
  console.log(JSON.stringify(report, null, 2));
  if (failures.length) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
