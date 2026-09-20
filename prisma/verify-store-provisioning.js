const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const fs = require("node:fs");
const path = require("node:path");
const {
  STORE_PERMISSIONS,
  STORE_ROLES,
} = require("./seed-identity-foundation.js");

const now = new Date("2026-01-01T00:00:00.000Z");

const copyMap = (source) =>
  new Map([...source.entries()].map(([key, value]) => [key, { ...value }]));

function createTransactionDatabase() {
  const state = {
    stores: new Map(),
    roles: new Map(),
    permissions: new Map(),
    members: new Map([
      [
        "existing-owner",
        {
          id: "existing-owner",
          storeId: "existing-store",
          name: "Existing Owner",
          email: "owner@example.com",
          normalizedEmail: "owner@example.com",
          passwordHash: "existing-hash",
          roleId: "existing-owner-role",
          status: "ACTIVE",
        },
      ],
    ]),
  };
  let failOnRoleCreate = false;
  let transactionCount = 0;

  const duplicate = () =>
    Object.assign(new Error("Unique constraint"), { code: "P2002" });

  const tx = {
    store: {
      async create({ data }) {
        if ([...state.stores.values()].some((store) => store.slug === data.slug)) {
          throw duplicate();
        }
        const store = {
          id: `store-${data.slug}`,
          ...data,
          createdAt: now,
          updatedAt: now,
        };
        state.stores.set(store.id, store);
        return store;
      },
    },
    storeRole: {
      async create({ data }) {
        if (failOnRoleCreate) throw new Error("Intentional role failure");
        const key = `${data.storeId}:${data.code}`;
        if (state.roles.has(key)) throw duplicate();
        const role = { id: `role-${key}`, ...data };
        state.roles.set(key, role);
        return role;
      },
    },
    storeRolePermission: {
      async create({ data }) {
        const key = `${data.roleId}:${data.resource}:${data.action}`;
        if (state.permissions.has(key)) throw duplicate();
        const permission = { id: `permission-${state.permissions.size + 1}`, ...data };
        state.permissions.set(key, permission);
        return { id: permission.id };
      },
    },
    storeMember: {
      async create({ data }) {
        const duplicateEmail = [...state.members.values()].some(
          (member) =>
            member.storeId === data.storeId &&
            member.normalizedEmail === data.normalizedEmail,
        );
        if (duplicateEmail) throw duplicate();
        const member = {
          id: `member-${data.storeId}-${state.members.size + 1}`,
          ...data,
          createdAt: now,
          updatedAt: now,
        };
        state.members.set(member.id, member);
        const role = [...state.roles.values()].find(
          (candidate) => candidate.id === member.roleId,
        );
        const {
          passwordHash: _passwordHash,
          normalizedEmail: _normalizedEmail,
          ...safeMember
        } = member;
        return {
          ...safeMember,
          role: role
            ? { id: role.id, name: role.name, code: role.code }
            : null,
        };
      },
    },
  };

  return {
    state,
    setRoleFailure(value) {
      failOnRoleCreate = value;
    },
    get transactionCount() {
      return transactionCount;
    },
    async $transaction(operation) {
      transactionCount += 1;
      const snapshot = {
        stores: copyMap(state.stores),
        roles: copyMap(state.roles),
        permissions: copyMap(state.permissions),
        members: copyMap(state.members),
      };
      try {
        return await operation(tx);
      } catch (error) {
        state.stores = snapshot.stores;
        state.roles = snapshot.roles;
        state.permissions = snapshot.permissions;
        state.members = snapshot.members;
        throw error;
      }
    },
  };
}

const allowPlatform = async (resource, action) => {
  assert.equal(resource, "STORES");
  assert.equal(action, "MANAGE");
  return true;
};

const rejectIdentity = (label) => async () => {
  throw new Error(`${label} cannot provision Stores.`);
};

const provisioningInput = (slug = "karim-store") => ({
  store: { name: "Karim Store", slug },
  owner: {
    name: "Karim Owner",
    email: " OWNER@Example.com ",
    phone: "01700000000",
    password: "owner-password",
  },
});

async function main() {
  const { provisionStore, StoreProvisioningError } = await import(
    "../backend/services/storeProvisioning.server.js"
  );
  const database = createTransactionDatabase();

  const result = await provisionStore(provisioningInput(), {
    database,
    requirePermission: allowPlatform,
  });
  assert.equal(result.store.slug, "karim-store");
  assert.equal(result.owner.storeId, result.store.id);
  assert.equal(result.owner.status, "ACTIVE");
  assert.equal(result.owner.email, "owner@example.com");
  assert.equal(result.owner.role.code, "OWNER");
  assert.equal(result.owner.roleId, result.owner.role.id);
  assert.equal("passwordHash" in result.owner, false);
  assert.equal(
    [...database.state.members.values()].filter(
      (member) => member.storeId === result.store.id,
    ).length,
    1,
  );

  const storedOwner = [...database.state.members.values()].find(
    (member) => member.storeId === result.store.id,
  );
  assert.notEqual(storedOwner.passwordHash, "owner-password");
  assert.equal(await bcrypt.compare("owner-password", storedOwner.passwordHash), true);
  assert.equal(storedOwner.normalizedEmail, "owner@example.com");

  const provisionedRoles = [...database.state.roles.values()].filter(
    (role) => role.storeId === result.store.id,
  );
  assert.deepEqual(
    provisionedRoles.map((role) => role.code).sort(),
    STORE_ROLES.map((role) => role.code).sort(),
  );
  for (const role of provisionedRoles) {
    assert.equal(role.storeId, result.store.id);
    const expected = STORE_PERMISSIONS[role.code];
    const actual = [...database.state.permissions.values()].filter(
      (permission) => permission.roleId === role.id,
    );
    assert.equal(actual.length, expected.length);
    for (const [resource, action] of expected) {
      assert.equal(
        actual.some(
          (permission) =>
            permission.resource === resource && permission.action === action,
        ),
        true,
      );
    }
  }

  // An owner email in another Store is not a global conflict.
  assert.equal(
    [...database.state.members.values()].filter(
      (member) => member.normalizedEmail === "owner@example.com",
    ).length,
    2,
  );

  const transactionsBeforeDenied = database.transactionCount;
  await assert.rejects(
    provisionStore(provisioningInput("denied-store"), {
      database,
      requirePermission: rejectIdentity("Platform member without permission"),
    }),
    /cannot provision/,
  );
  await assert.rejects(
    provisionStore(provisioningInput("store-member-denied"), {
      database,
      requirePermission: rejectIdentity("StoreMember"),
    }),
    /StoreMember/,
  );
  await assert.rejects(
    provisionStore(provisioningInput("legacy-user-denied"), {
      database,
      requirePermission: rejectIdentity("Legacy User"),
    }),
    /Legacy User/,
  );
  assert.equal(database.transactionCount, transactionsBeforeDenied);

  await assert.rejects(
    provisionStore(provisioningInput(), {
      database,
      requirePermission: allowPlatform,
    }),
    (error) =>
      error instanceof StoreProvisioningError &&
      error.code === "STORE_CONFLICT",
  );

  const beforeRollback = {
    stores: database.state.stores.size,
    roles: database.state.roles.size,
    permissions: database.state.permissions.size,
    members: database.state.members.size,
  };
  database.setRoleFailure(true);
  await assert.rejects(
    provisionStore(provisioningInput("rollback-store"), {
      database,
      requirePermission: allowPlatform,
    }),
    /Intentional role failure/,
  );
  database.setRoleFailure(false);
  assert.deepEqual(
    {
      stores: database.state.stores.size,
      roles: database.state.roles.size,
      permissions: database.state.permissions.size,
      members: database.state.members.size,
    },
    beforeRollback,
  );
  assert.equal(database.state.stores.has("store-rollback-store"), false);

  const schema = fs.readFileSync(path.join(__dirname, "schema.prisma"), "utf8");
  assert.match(schema, /@@unique\(\[storeId, normalizedEmail\]\)/);
  const ownerProtection = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "backend",
      "services",
      "storeMemberManagement.server.js",
    ),
    "utf8",
  );
  assert.match(ownerProtection, /ensureAnotherOwner/);

  for (const untouched of ["auth.js", "proxy.js", "backend/utils/hasPermission.js"]) {
    assert.equal(fs.existsSync(path.join(__dirname, "..", untouched)), true);
  }

  console.log("Store provisioning verification passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
