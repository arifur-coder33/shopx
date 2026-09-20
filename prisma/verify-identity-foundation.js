const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  PLATFORM_PERMISSIONS,
  PLATFORM_ROLES,
  STORE_PERMISSIONS,
  STORE_ROLES,
  seedIdentityFoundation,
} = require("./seed-identity-foundation.js");

function createSeedDatabase() {
  const platformRoles = new Map();
  const platformPermissions = new Map();
  const storeRoles = new Map();
  const storePermissions = new Map();
  const stores = [{ id: "store-a" }, { id: "store-b" }];

  return {
    platformRoles,
    platformPermissions,
    storeRoles,
    storePermissions,
    platformRole: {
      async upsert({ where, update, create }) {
        const existing = platformRoles.get(where.code);
        const record = existing
          ? { ...existing, ...update }
          : { id: `platform-role-${where.code}`, ...create };
        platformRoles.set(where.code, record);
        return record;
      },
    },
    platformRolePermission: {
      async upsert({ where, update, create }) {
        const identity = where.roleId_resource_action;
        const key = `${identity.roleId}:${identity.resource}:${identity.action}`;
        const existing = platformPermissions.get(key);
        const record = existing ? { ...existing, ...update } : { ...create };
        platformPermissions.set(key, record);
        return record;
      },
    },
    store: {
      async findMany() {
        return stores;
      },
    },
    storeRole: {
      async upsert({ where, update, create }) {
        const key = `${where.storeId_code.storeId}:${where.storeId_code.code}`;
        const existing = storeRoles.get(key);
        const record = existing ? { ...existing, ...update } : { id: key, ...create };
        storeRoles.set(key, record);
        return record;
      },
    },
    storeRolePermission: {
      async upsert({ where, update, create }) {
        const identity = where.roleId_resource_action;
        const key = `${identity.roleId}:${identity.resource}:${identity.action}`;
        const existing = storePermissions.get(key);
        const record = existing ? { ...existing, ...update } : { ...create };
        storePermissions.set(key, record);
        return record;
      },
    },
  };
}

const identityKey = (storeId, email) =>
  `${storeId}:${String(email).trim().toLowerCase()}`;

async function main() {
  const database = createSeedDatabase();
  await seedIdentityFoundation(database);
  const firstSeedSnapshot = {
    platformRoles: Array.from(database.platformRoles.entries()),
    platformPermissions: Array.from(database.platformPermissions.entries()),
    storeRoles: Array.from(database.storeRoles.entries()),
    storePermissions: Array.from(database.storePermissions.entries()),
  };
  await seedIdentityFoundation(database);
  assert.deepEqual(
    {
      platformRoles: Array.from(database.platformRoles.entries()),
      platformPermissions: Array.from(database.platformPermissions.entries()),
      storeRoles: Array.from(database.storeRoles.entries()),
      storePermissions: Array.from(database.storePermissions.entries()),
    },
    firstSeedSnapshot,
  );

  assert.equal(database.platformRoles.size, PLATFORM_ROLES.length);
  assert.equal(database.storeRoles.size, STORE_ROLES.length * 2);
  const expectedPlatformPermissionCount = Object.values(
    PLATFORM_PERMISSIONS,
  ).reduce((total, permissions) => total + permissions.length, 0);
  const expectedStorePermissionCount = Object.values(STORE_PERMISSIONS).reduce(
    (total, permissions) => total + permissions.length,
    0,
  );
  assert.equal(
    database.platformPermissions.size,
    expectedPlatformPermissionCount,
  );
  assert.equal(
    database.storePermissions.size,
    expectedStorePermissionCount * 2,
  );
  for (const role of PLATFORM_ROLES) {
    assert.equal(database.platformRoles.get(role.code)?.status, "ACTIVE");
  }
  for (const storeId of ["store-a", "store-b"]) {
    for (const role of STORE_ROLES) {
      assert.equal(database.storeRoles.has(`${storeId}:${role.code}`), true);
    }
  }
  for (const [roleCode, permissions] of Object.entries(PLATFORM_PERMISSIONS)) {
    const roleId = database.platformRoles.get(roleCode).id;
    for (const [resource, action] of permissions) {
      assert.equal(
        database.platformPermissions.has(`${roleId}:${resource}:${action}`),
        true,
      );
    }
  }
  for (const storeId of ["store-a", "store-b"]) {
    for (const [roleCode, permissions] of Object.entries(STORE_PERMISSIONS)) {
      const roleId = database.storeRoles.get(`${storeId}:${roleCode}`).id;
      for (const [resource, action] of permissions) {
        assert.equal(
          database.storePermissions.has(`${roleId}:${resource}:${action}`),
          true,
        );
      }
    }
  }

  const schema = fs.readFileSync(
    path.join(__dirname, "schema.prisma"),
    "utf8",
  );
  const scopedEmailConstraint = /@@unique\(\[storeId, normalizedEmail\]\)/g;
  assert.equal(
    (schema.match(scopedEmailConstraint) || []).length,
    2,
    "StoreMember and StoreCustomer must both use Store-scoped email uniqueness.",
  );

  assert.equal(
    identityKey("store-a", "Arif@Example.com"),
    identityKey("store-a", " arif@example.com "),
  );
  assert.notEqual(
    identityKey("store-a", "arif@example.com"),
    identityKey("store-b", "arif@example.com"),
  );

  console.log("Identity foundation verification passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
