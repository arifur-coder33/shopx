const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

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
    "role",
    "media",
    "resource",
    "rolePermission",
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
