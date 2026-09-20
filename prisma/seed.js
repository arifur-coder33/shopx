const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { seedIdentityFoundation } = require("./seed-identity-foundation.js");

const prisma = new PrismaClient();

async function seedStoreFoundation() {
  const { getDeploymentMode } = await import(
    "../backend/services/deploymentModeService.js"
  );
  const { ensureDefaultStandaloneStore } = await import(
    "../backend/services/storeContextService.js"
  );

  if (getDeploymentMode() !== "STANDALONE") return null;
  return ensureDefaultStandaloneStore(prisma);
}

async function seedFinanceProviders(storeId) {
  const {
    getProviderAccountType,
    getProviderRuntimeConfiguration,
    getProviderSeedDefinitions,
  } = await import("../backend/services/providerCredentialService.js");

  let defaultCash = await prisma.moneyAccount.findFirst({
    where: { storeId, accountNumber: "DEFAULT_CASH" },
  });
  if (!defaultCash) {
    defaultCash = await prisma.moneyAccount.create({
      data: {
        storeId,
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
        where: { storeId_code: { storeId, code: definition.code } },
      });
      let provider = existing
        ? await model.update({
            where: { id: existing.id },
            data: {
              storeId,
              adapterKey: definition.adapterKey,
              sortOrder: definition.sortOrder,
              ...(!definition.defaultActive &&
                !existing.encryptedCredentials && { isActive: false }),
              updatedBy: "seed",
            },
          })
        : await model.create({
            data: {
              storeId,
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
            where: { id: provider.moneyAccountId, storeId },
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
          where: { storeId, accountNumber },
        });
        if (!account) {
          account = await prisma.moneyAccount.findFirst({
            where: {
              storeId,
              name: { equals: provider.name, mode: "insensitive" },
              type: accountType,
            },
          });
        }
        if (!account) {
          account = await prisma.moneyAccount.create({
            data: {
              storeId,
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
            where: { id: account.id, storeId },
            data: { isActive: true, updatedBy: "seed" },
          });
        }
        provider = await model.update({
          where: { id: provider.id, storeId },
          data: { moneyAccountId: account.id, updatedBy: "seed" },
        });
      }
    }
  }
}

async function seedSocialTrackingSettings(storeId) {
  const existing = await prisma.socialTrackingSetting.findUnique({
    where: { storeId },
  });
  if (existing) return;

  const secrets = {
    facebookAccessToken: process.env.FB_ACCESS_TOKEN || "",
    facebookTestEventCode: process.env.FB_TEST_EVENT_CODE || "",
    googleAnalyticsSecret: process.env.GOOGLE_ANALYTICS_SECRET || "",
    tiktokAccessToken: process.env.TT_ACCESS_TOKEN || "",
  };
  const populatedSecrets = Object.fromEntries(
    Object.entries(secrets).filter(([, value]) => value),
  );
  let encryptedSecrets = null;
  if (Object.keys(populatedSecrets).length) {
    const { encryptProviderCredentials } = await import(
      "../backend/services/providerCredentialService.js"
    );
    encryptedSecrets = encryptProviderCredentials(populatedSecrets);
  }

  await prisma.socialTrackingSetting.create({
    data: {
      id: `SOCIAL_TRACKING:${storeId}`,
      storeId,
      facebookPixelId:
        process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID ||
        process.env.FB_PIXEL_ID ||
        null,
      googleTagId: process.env.NEXT_PUBLIC_GOOGLE_TAG_ID || null,
      googleAnalyticsId:
        process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID || null,
      tiktokPixelId: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || null,
      encryptedSecrets,
      ...(encryptedSecrets && { secretsUpdatedAt: new Date() }),
      createdBy: "seed",
      updatedBy: "seed",
    },
  });
}

async function seedContentPages(storeId) {
  const pages = [
    {
      slug: "contact",
      title: "যোগাযোগ করুন",
      content: "<p>আমাদের সঙ্গে যোগাযোগের তথ্য এখানে লিখুন।</p>",
    },
    {
      slug: "return-policy",
      title: "রিটার্ন পলিসি",
      content: "<p>আপনার প্রতিষ্ঠানের রিটার্ন ও রিফান্ড নীতিমালা এখানে লিখুন।</p>",
    },
    {
      slug: "privacy",
      title: "প্রাইভেসি পলিসি",
      content: "<p>গ্রাহকের তথ্য সংগ্রহ, ব্যবহার ও সুরক্ষার নীতিমালা এখানে লিখুন।</p>",
    },
  ];

  for (const page of pages) {
    await prisma.contentPage.upsert({
      where: { storeId_slug: { storeId, slug: page.slug } },
      update: {},
      create: { storeId, ...page, isPublished: true, createdBy: "seed", updatedBy: "seed" },
    });
  }
}

async function main() {
  console.log("🌱 Running MASTER RBAC seed...");

  const defaultStore = await seedStoreFoundation();
  await seedIdentityFoundation(prisma);

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
    "socialTracking",
    "siteSetting",
    "contentPage",
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
  if (defaultStore) {
    await seedFinanceProviders(defaultStore.id);
    await seedSocialTrackingSettings(defaultStore.id);
    await seedContentPages(defaultStore.id);
  }

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
