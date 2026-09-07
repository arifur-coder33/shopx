const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function seedFinanceProviders() {
  const {
    getProviderAccountType,
    getProviderRuntimeConfiguration,
    getProviderSeedDefinitions,
  } = await import("../backend/services/providerCredentialService.js");

  let defaultCash = await prisma.moneyAccount.findFirst({
    where: { accountNumber: "DEFAULT_CASH" },
  });
  if (!defaultCash) {
    defaultCash = await prisma.moneyAccount.create({
      data: {
        name: "Cash",
        type: "CASH",
        accountNumber: "DEFAULT_CASH",
        isActive: true,
        createdBy: "seed",
        updatedBy: "seed",
      },
    });
  }

  for (const kind of ["gateway", "courier"]) {
    const model =
      prisma[kind === "gateway" ? "paymentGateway" : "courierProvider"];
    for (const definition of getProviderSeedDefinitions(kind)) {
      const existing = await model.findUnique({
        where: { code: definition.code },
      });
      let provider = existing
        ? await model.update({
            where: { id: existing.id },
            data: {
              adapterKey: definition.adapterKey,
              sortOrder: definition.sortOrder,
              ...(!definition.defaultActive &&
                !existing.encryptedCredentials && { isActive: false }),
              updatedBy: "seed",
            },
          })
        : await model.create({
            data: {
              name: definition.name,
              code: definition.code,
              adapterKey: definition.adapterKey,
              sortOrder: definition.sortOrder,
              isActive: definition.defaultActive,
              nonSecretConfig: definition.defaultConfig,
              createdBy: "seed",
              updatedBy: "seed",
            },
          });

      const runtime = getProviderRuntimeConfiguration(kind, provider);
      const mappedAccount = provider.moneyAccountId
        ? await prisma.moneyAccount.findUnique({
            where: { id: provider.moneyAccountId },
          })
        : null;
      if (
        provider.isActive &&
        runtime.moneyAccountRequired &&
        !mappedAccount
      ) {
        const accountNumber = `PROVIDER:${kind.toUpperCase()}:${provider.code}`;
        const accountType = getProviderAccountType(kind, provider.adapterKey);
        let account = await prisma.moneyAccount.findFirst({
          where: { accountNumber },
        });
        if (!account) {
          account = await prisma.moneyAccount.findFirst({
            where: {
              name: { equals: provider.name, mode: "insensitive" },
              type: accountType,
            },
          });
        }
        if (!account) {
          account = await prisma.moneyAccount.create({
            data: {
              name: provider.name,
              type: accountType,
              accountNumber,
              isActive: true,
              createdBy: "seed",
              updatedBy: "seed",
            },
          });
        } else if (!account.isActive) {
          account = await prisma.moneyAccount.update({
            where: { id: account.id },
            data: { isActive: true, updatedBy: "seed" },
          });
        }
        provider = await model.update({
          where: { id: provider.id },
          data: { moneyAccountId: account.id, updatedBy: "seed" },
        });
      }
    }
  }
}

async function main() {
  console.log("🌱 Running MASTER RBAC seed...");

  /* ======================
     1️⃣ ROLES
  ====================== */
  const roles = ["SUPER_ADMIN", "ADMIN", "MANAGER", "USER"];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role },
      update: {},
      create: { name: role },
    });
  }

  /* ======================
     2️⃣ RESOURCES
  ====================== */
  const resources = [
    "user",
    "category",
    "product",
    "variation",
    "sellReport",
    "order",
    "pos",
    "role",
    "media",
    "resource",
    "rolePermission",
    "supplier",
    "purchase",
    "goodsReceipt",
    "inventory",
    "warehouse",
    "supplierPayment",
    "expense",
    "delivery",
    "accounting",
    "provider",
  ];

  for (const key of resources) {
    await prisma.resource.upsert({
      where: { key },
      update: {},
      create: { key },
    });
  }

  /* ======================
     3️⃣ ACTIONS
  ====================== */
  const actions = ["create", "view", "update", "delete"];

  for (const key of actions) {
    await prisma.action.upsert({
      where: { key },
      update: {},
      create: { key },
    });
  }

  /* ======================
     4️⃣ SUPER_ADMIN PERMISSIONS (ALL)
  ====================== */
  const superAdminRole = await prisma.role.findUnique({
    where: { name: "SUPER_ADMIN" },
  });

  const allResources = await prisma.resource.findMany();
  const allActions = await prisma.action.findMany();

  for (const resource of allResources) {
    for (const action of allActions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_resourceId_actionId: {
            roleId: superAdminRole.id,
            resourceId: resource.id,
            actionId: action.id,
          },
        },
        update: { allowed: true },
        create: {
          roleId: superAdminRole.id,
          resourceId: resource.id,
          actionId: action.id,
          allowed: true,
        },
      });
    }
  }

  /* ======================
     5️⃣ SUPER_ADMIN USER (ENV)
  ====================== */
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("SUPER_ADMIN_EMAIL or PASSWORD missing in .env");
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      roleId: superAdminRole.id,
    },
    create: {
      email,
      password: hashedPassword,
      roleId: superAdminRole.id,
    },
  });

  /* ======================
     6️⃣ MONEY ACCOUNTS + PROVIDERS
  ====================== */
  await seedFinanceProviders();

  console.log("✅ MASTER seed completed successfully");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
