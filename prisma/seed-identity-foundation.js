const PLATFORM_ROLES = Object.freeze([
  { code: "SUPER_ADMIN", name: "Super Admin" },
  { code: "PLATFORM_ADMIN", name: "Platform Admin" },
  { code: "SUPPORT", name: "Support" },
  { code: "BILLING", name: "Billing" },
]);

const STORE_ROLES = Object.freeze([
  { code: "OWNER", name: "Owner" },
  { code: "ADMIN", name: "Admin" },
  { code: "MANAGER", name: "Manager" },
  { code: "STAFF", name: "Staff" },
]);

const PLATFORM_PERMISSIONS = Object.freeze({
  SUPER_ADMIN: [
    ["PLATFORM", "VIEW"],
    ["PLATFORM", "MANAGE"],
    ["STORES", "VIEW"],
    ["STORES", "MANAGE"],
    ["BILLING", "VIEW"],
    ["BILLING", "MANAGE"],
  ],
  PLATFORM_ADMIN: [
    ["PLATFORM", "VIEW"],
    ["STORES", "VIEW"],
    ["STORES", "MANAGE"],
  ],
  SUPPORT: [
    ["PLATFORM", "VIEW"],
    ["STORES", "VIEW"],
  ],
  BILLING: [
    ["PLATFORM", "VIEW"],
    ["BILLING", "VIEW"],
    ["BILLING", "MANAGE"],
  ],
});

const STORE_PERMISSIONS = Object.freeze({
  OWNER: [
    ["STORE", "VIEW"],
    ["STORE", "MANAGE"],
    ["STAFF", "VIEW"],
    ["STAFF", "MANAGE"],
    ["WAREHOUSE", "CREATE"],
    ["INVENTORY", "UPDATE"],
    ["PURCHASE_ORDER", "CREATE"],
    ["PURCHASE_ORDER", "UPDATE"],
    ["GOODS_RECEIPT", "CREATE"],
    ["SUPPLIER_PAYMENT", "CREATE"],
    ["SUPPLIER_PAYMENT", "VIEW"],
    ["MONEY_ACCOUNT", "VIEW"],
    ["MONEY_ACCOUNT", "CREATE"],
    ["MONEY_ACCOUNT", "UPDATE"],
    ["MONEY_ACCOUNT", "DELETE"],
    ["MONEY_TRANSACTION", "POST"],
    ["EXPENSE", "VIEW"],
    ["EXPENSE", "CREATE"],
    ["EXPENSE", "UPDATE"],
    ["EXPENSE", "DELETE"],
    ["POS", "VIEW"],
    ["POS", "CREATE"],
    ["FINANCIAL_REPORT", "VIEW"],
    ["PAYMENT", "CREATE"],
    ["REFUND", "CREATE"],
    ["PURCHASE_ORDER", "VIEW"],
  ],
  ADMIN: [
    ["STORE", "VIEW"],
    ["STORE", "MANAGE"],
    ["STAFF", "VIEW"],
    ["STAFF", "MANAGE"],
    ["WAREHOUSE", "CREATE"],
    ["INVENTORY", "UPDATE"],
    ["PURCHASE_ORDER", "CREATE"],
    ["PURCHASE_ORDER", "UPDATE"],
    ["GOODS_RECEIPT", "CREATE"],
    ["SUPPLIER_PAYMENT", "CREATE"],
    ["SUPPLIER_PAYMENT", "VIEW"],
    ["MONEY_ACCOUNT", "VIEW"],
    ["MONEY_ACCOUNT", "CREATE"],
    ["MONEY_ACCOUNT", "UPDATE"],
    ["MONEY_ACCOUNT", "DELETE"],
    ["MONEY_TRANSACTION", "POST"],
    ["EXPENSE", "VIEW"],
    ["EXPENSE", "CREATE"],
    ["EXPENSE", "UPDATE"],
    ["EXPENSE", "DELETE"],
    ["POS", "VIEW"],
    ["POS", "CREATE"],
    ["FINANCIAL_REPORT", "VIEW"],
    ["PAYMENT", "CREATE"],
    ["REFUND", "CREATE"],
    ["PURCHASE_ORDER", "VIEW"],
  ],
  MANAGER: [
    ["STORE", "VIEW"],
    ["STAFF", "VIEW"],
  ],
  STAFF: [["STORE", "VIEW"]],
});

async function seedPlatformPermissions(prisma, role, permissions) {
  for (const [resource, action] of permissions) {
    await prisma.platformRolePermission.upsert({
      where: {
        roleId_resource_action: { roleId: role.id, resource, action },
      },
      update: {},
      create: { roleId: role.id, resource, action },
    });
  }
}

async function seedStorePermissions(prisma, role, permissions) {
  for (const [resource, action] of permissions) {
    await prisma.storeRolePermission.upsert({
      where: {
        roleId_resource_action: { roleId: role.id, resource, action },
      },
      update: {},
      create: { roleId: role.id, resource, action },
    });
  }
}

async function seedIdentityFoundation(prisma) {
  for (const role of PLATFORM_ROLES) {
    const savedRole = await prisma.platformRole.upsert({
      where: { code: role.code },
      update: { name: role.name, status: "ACTIVE" },
      create: { ...role, status: "ACTIVE" },
    });
    await seedPlatformPermissions(
      prisma,
      savedRole,
      PLATFORM_PERMISSIONS[role.code],
    );
  }

  const stores = await prisma.store.findMany({ select: { id: true } });
  for (const store of stores) {
    for (const role of STORE_ROLES) {
      const savedRole = await prisma.storeRole.upsert({
        where: {
          storeId_code: { storeId: store.id, code: role.code },
        },
        update: { name: role.name, status: "ACTIVE" },
        create: {
          ...role,
          storeId: store.id,
          status: "ACTIVE",
        },
      });
      await seedStorePermissions(
        prisma,
        savedRole,
        STORE_PERMISSIONS[role.code],
      );
    }
  }
}

module.exports = {
  PLATFORM_ROLES,
  PLATFORM_PERMISSIONS,
  STORE_ROLES,
  STORE_PERMISSIONS,
  seedIdentityFoundation,
};
