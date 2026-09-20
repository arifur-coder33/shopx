const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const permissionKey = (resource, action) => `${resource}:${action}`;

function createAuthorizationDatabase() {
  const calls = { platformMember: 0, storeMember: 0 };
  const platformMember = {
    id: "platform-member",
    roleId: "platform-role",
    status: "ACTIVE",
    role: {
      id: "platform-role",
      status: "ACTIVE",
      permissions: new Set([permissionKey("store", "view")]),
    },
  };
  const storeMembers = new Map([
    [
      "store-member-a",
      {
        id: "store-member-a",
        storeId: "store-a",
        roleId: "store-role-a",
        status: "ACTIVE",
        role: {
          id: "store-role-a",
          storeId: "store-a",
          status: "ACTIVE",
          permissions: new Set([permissionKey("product", "update")]),
        },
      },
    ],
    [
      "store-member-b",
      {
        id: "store-member-b",
        storeId: "store-b",
        roleId: "store-role-b",
        status: "ACTIVE",
        role: {
          id: "store-role-b",
          storeId: "store-b",
          status: "ACTIVE",
          permissions: new Set([permissionKey("product", "delete")]),
        },
      },
    ],
  ]);

  const selectedMember = (member, query) => {
    if (!member) return null;
    const where = query.where;
    if (
      member.id !== where.id ||
      member.roleId !== where.roleId ||
      member.status !== where.status ||
      (where.storeId && member.storeId !== where.storeId)
    ) {
      return null;
    }
    const requested = query.select.role.select.permissions.where;
    const hasPermission = member.role.permissions.has(
      permissionKey(requested.resource, requested.action),
    );
    return {
      id: member.id,
      role: {
        id: member.role.id,
        storeId: member.role.storeId,
        status: member.role.status,
        permissions: hasPermission ? [{ id: "permission" }] : [],
      },
    };
  };

  return {
    calls,
    platformMember: {
      async findFirst(query) {
        calls.platformMember += 1;
        return selectedMember(platformMember, query);
      },
    },
    storeMember: {
      async findFirst(query) {
        calls.storeMember += 1;
        return selectedMember(storeMembers.get(query.where.id), query);
      },
    },
    platformRolePermission: {
      async findFirst() {
        throw new Error("Global PlatformRolePermission lookup is forbidden.");
      },
    },
    storeRolePermission: {
      async findFirst() {
        throw new Error("Global StoreRolePermission lookup is forbidden.");
      },
    },
    rolePermission: {
      async findFirst() {
        throw new Error("Existing RolePermission must not be queried.");
      },
    },
  };
}

const platformSession = (identityType = "PLATFORM_MEMBER") => ({
  user: {
    identityType,
    platformMemberId: "platform-member",
    roleId: "platform-role",
  },
});

const storeSession = ({
  memberId = "store-member-a",
  storeId = "store-a",
  roleId = "store-role-a",
  identityType = "STORE_MEMBER",
} = {}) => ({
  user: { identityType, storeMemberId: memberId, storeId, roleId },
});

const storeContext = (storeId) => async () => ({
  type: "STORE",
  store: { id: storeId },
});

async function main() {
  const {
    IdentityAuthorizationError,
    hasPlatformPermission,
    hasStorePermission,
    requirePlatformPermission,
    requireStorePermission,
  } = await import("../backend/services/identityAuthorization.server.js");
  const database = createAuthorizationDatabase();

  assert.equal(
    await hasPlatformPermission("store", "view", {
      database,
      getSession: async () => platformSession(),
    }),
    true,
  );
  assert.equal(
    await hasPlatformPermission("store", "delete", {
      database,
      getSession: async () => platformSession(),
    }),
    false,
  );
  const beforeWrongIdentity = database.calls.platformMember;
  assert.equal(
    await hasPlatformPermission("store", "view", {
      database,
      getSession: async () => platformSession("USER"),
    }),
    false,
  );
  assert.equal(database.calls.platformMember, beforeWrongIdentity);
  assert.equal(database.calls.storeMember, 0);
  assert.equal(
    await requirePlatformPermission("store", "view", {
      database,
      getSession: async () => platformSession(),
    }),
    true,
  );

  const storeAOptions = {
    database,
    getSession: async () => storeSession(),
    getStoreContext: storeContext("store-a"),
  };
  assert.equal(
    await hasStorePermission("product", "update", storeAOptions),
    true,
  );
  assert.equal(
    await hasStorePermission("product", "delete", storeAOptions),
    false,
  );

  assert.equal(
    await hasStorePermission("product", "delete", {
      database,
      getSession: async () =>
        storeSession({ roleId: "store-role-b" }),
      getStoreContext: storeContext("store-a"),
    }),
    false,
  );
  assert.equal(
    await hasStorePermission("product", "update", {
      database,
      getSession: async () => storeSession(),
      getStoreContext: storeContext("store-b"),
    }),
    false,
  );
  assert.equal(
    await hasStorePermission("product", "delete", {
      database,
      getSession: async () =>
        storeSession({
          memberId: "store-member-b",
          storeId: "store-b",
          roleId: "store-role-b",
        }),
      getStoreContext: storeContext("store-b"),
    }),
    true,
  );

  const beforeInvalidContext = database.calls.storeMember;
  assert.equal(
    await hasStorePermission("product", "update", {
      database,
      getSession: async () => storeSession(),
      getStoreContext: async () => ({ type: "PLATFORM", store: null }),
    }),
    false,
  );
  assert.equal(database.calls.storeMember, beforeInvalidContext);

  assert.equal(
    await hasStorePermission("product", "update", {
      database,
      getSession: async () => platformSession(),
      getStoreContext: storeContext("store-a"),
    }),
    false,
  );

  await assert.rejects(
    requireStorePermission("product", "delete", storeAOptions),
    (error) =>
      error instanceof IdentityAuthorizationError && error.code === "FORBIDDEN",
  );

  const existingHelper = fs.readFileSync(
    path.join(__dirname, "..", "backend", "utils", "hasPermission.js"),
    "utf8",
  );
  assert.match(existingHelper, /export async function hasPermission\(/);
  assert.match(existingHelper, /import \{ auth \} from "@\/auth"/);

  console.log("Identity authorization verification passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
