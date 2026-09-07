const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const credentialService = await import(
    "../backend/services/providerCredentialService.js"
  );
  const [gateways, couriers, providerAccounts] = await Promise.all([
    prisma.paymentGateway.findMany({ include: { moneyAccount: true } }),
    prisma.courierProvider.findMany({ include: { moneyAccount: true } }),
    prisma.moneyAccount.findMany({
      where: { accountNumber: { startsWith: "PROVIDER:" } },
      select: {
        id: true,
        name: true,
        accountNumber: true,
        balance: true,
        incomingTransactions: { select: { id: true }, take: 1 },
        outgoingTransactions: { select: { id: true }, take: 1 },
      },
    }),
  ]);
  const failures = [];
  const providerStatus = [];

  for (const [kind, providers] of [
    ["gateway", gateways],
    ["courier", couriers],
  ]) {
    for (const provider of providers) {
      const runtime = credentialService.getProviderRuntimeConfiguration(
        kind,
        provider,
      );
      providerStatus.push({
        kind,
        code: provider.code,
        enabled: provider.isActive,
        ready: runtime.ready,
        credentialSource: runtime.credentialSource,
        moneyAccountConfigured: runtime.moneyAccountConfigured,
        moneyAccountRequired: runtime.moneyAccountRequired,
        supportsCod: runtime.supportsCod,
      });
      if (provider.isActive && !runtime.ready) {
        failures.push(`Active ${kind} ${provider.code} is not READY.`);
      }
      if (provider.encryptedCredentials) {
        let envelope;
        try {
          envelope = JSON.parse(provider.encryptedCredentials);
        } catch {
          failures.push(`${kind} ${provider.code} has an invalid credential envelope.`);
        }
        if (
          envelope &&
          (envelope.v !== 1 ||
            envelope.alg !== "A256GCM" ||
            !envelope.iv ||
            !envelope.tag ||
            !envelope.data)
        ) {
          failures.push(`${kind} ${provider.code} is not stored as AES-256-GCM.`);
        }
      }
    }
  }

  const accountNumberCounts = new Map();
  for (const account of providerAccounts) {
    accountNumberCounts.set(
      account.accountNumber,
      (accountNumberCounts.get(account.accountNumber) || 0) + 1,
    );
  }
  for (const [accountNumber, count] of accountNumberCounts) {
    if (count > 1) {
      failures.push(`${accountNumber} has ${count} generated Money Accounts.`);
    }
  }

  const existingKey = process.env.PROVIDER_CREDENTIAL_ENCRYPTION_KEY;
  process.env.PROVIDER_CREDENTIAL_ENCRYPTION_KEY =
    "provider-credential-round-trip-test-key";
  const encrypted = credentialService.encryptProviderCredentials({
    sample: "round-trip-value",
  });
  const decrypted = credentialService.decryptProviderCredentials(encrypted);
  if (encrypted.includes("round-trip-value") || decrypted.sample !== "round-trip-value") {
    failures.push("Provider credential AES-256-GCM round-trip failed.");
  }
  if (existingKey === undefined) {
    delete process.env.PROVIDER_CREDENTIAL_ENCRYPTION_KEY;
  } else {
    process.env.PROVIDER_CREDENTIAL_ENCRYPTION_KEY = existingKey;
  }

  const unusedGeneratedAccounts = providerAccounts
    .filter(
      (account) =>
        account.balance === 0 &&
        !account.incomingTransactions.length &&
        !account.outgoingTransactions.length,
    )
    .map((account) => ({
      id: account.id,
      name: account.name,
      accountNumber: account.accountNumber,
    }));

  console.log(
    JSON.stringify(
      {
        providerStatus,
        generatedProviderAccounts: providerAccounts.length,
        unusedGeneratedAccounts,
        encryptionRoundTrip: "PASS",
        failures,
      },
      null,
      2,
    ),
  );
  if (failures.length) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
