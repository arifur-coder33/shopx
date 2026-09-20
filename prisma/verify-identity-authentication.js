const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const { PLATFORM_ROLES } = require("./seed-identity-foundation.js");

function createIdentityDatabase({ platformMembers, storeMembers }) {
  const calls = { platformMember: 0, storeMember: 0 };

  return {
    calls,
    platformMember: {
      async findUnique({ where }) {
        calls.platformMember += 1;
        return platformMembers.get(where.normalizedEmail) || null;
      },
    },
    storeMember: {
      async findUnique({ where }) {
        calls.storeMember += 1;
        const identity = where.storeId_normalizedEmail;
        return (
          storeMembers.get(`${identity.storeId}:${identity.normalizedEmail}`) ||
          null
        );
      },
    },
  };
}

async function main() {
  const {
    AUTHENTICATION_RESULT,
    authenticatePlatformMember,
    authenticateStoreMember,
  } = await import("../backend/services/identityAuthentication.server.js");
  const { normalizeEmail } = await import(
    "../backend/utils/normalizeEmail.js"
  );

  assert.deepEqual(
    PLATFORM_ROLES.map((role) => role.code),
    ["SUPER_ADMIN", "PLATFORM_ADMIN", "SUPPORT", "BILLING"],
  );
  assert.equal(normalizeEmail(" Admin@Example.COM "), "admin@example.com");

  const platformPassword = await bcrypt.hash("platform-secret", 4);
  const storeAPassword = await bcrypt.hash("store-a-secret", 4);
  const storeBPassword = await bcrypt.hash("store-b-secret", 4);
  const inactivePassword = await bcrypt.hash("inactive-secret", 4);

  const platformMembers = new Map([
    [
      "admin@example.com",
      {
        id: "platform-1",
        roleId: "platform-role-1",
        passwordHash: platformPassword,
        status: "ACTIVE",
        tokenVersion: 0,
        role: { code: "SUPER_ADMIN", status: "ACTIVE" },
      },
    ],
    [
      "inactive@example.com",
      {
        id: "platform-2",
        roleId: "platform-role-2",
        passwordHash: inactivePassword,
        status: "INACTIVE",
        tokenVersion: 0,
        role: { code: "SUPPORT", status: "ACTIVE" },
      },
    ],
  ]);
  const storeMembers = new Map([
    [
      "store-a:admin@example.com",
      {
        id: "member-a",
        storeId: "store-a",
        roleId: "role-a",
        passwordHash: storeAPassword,
        status: "ACTIVE",
        tokenVersion: 0,
        role: { code: "OWNER", status: "ACTIVE" },
      },
    ],
    [
      "store-b:admin@example.com",
      {
        id: "member-b",
        storeId: "store-b",
        roleId: "role-b",
        passwordHash: storeBPassword,
        status: "ACTIVE",
        tokenVersion: 0,
        role: { code: "ADMIN", status: "ACTIVE" },
      },
    ],
    [
      "store-a:inactive@example.com",
      {
        id: "member-inactive",
        storeId: "store-a",
        roleId: "role-a",
        passwordHash: inactivePassword,
        status: "INACTIVE",
        tokenVersion: 0,
        role: { code: "STAFF", status: "ACTIVE" },
      },
    ],
  ]);
  const database = createIdentityDatabase({ platformMembers, storeMembers });

  const platformSuccess = await authenticatePlatformMember(
    { email: " ADMIN@example.com ", password: "platform-secret" },
    database,
  );
  assert.equal(platformSuccess.success, true);
  assert.equal(platformSuccess.identity.type, "PLATFORM_MEMBER");
  assert.equal("passwordHash" in platformSuccess.identity, false);
  assert.equal(database.calls.storeMember, 0);

  const platformWrongPassword = await authenticatePlatformMember(
    { email: "admin@example.com", password: "wrong" },
    database,
  );
  assert.equal(
    platformWrongPassword.code,
    AUTHENTICATION_RESULT.INVALID_PASSWORD,
  );
  const inactivePlatform = await authenticatePlatformMember(
    { email: "inactive@example.com", password: "inactive-secret" },
    database,
  );
  assert.equal(inactivePlatform.code, AUTHENTICATION_RESULT.MEMBER_INACTIVE);

  const storeASuccess = await authenticateStoreMember(
    {
      trustedStoreId: "store-a",
      email: "Admin@Example.com",
      password: "store-a-secret",
    },
    database,
  );
  const storeBSuccess = await authenticateStoreMember(
    {
      trustedStoreId: "store-b",
      email: "admin@example.com",
      password: "store-b-secret",
    },
    database,
  );
  assert.equal(storeASuccess.success, true);
  assert.equal(storeASuccess.identity.id, "member-a");
  assert.equal(storeBSuccess.success, true);
  assert.equal(storeBSuccess.identity.id, "member-b");
  assert.equal("passwordHash" in storeASuccess.identity, false);

  const crossStoreAttempt = await authenticateStoreMember(
    {
      trustedStoreId: "store-a",
      email: "admin@example.com",
      password: "store-b-secret",
    },
    database,
  );
  assert.equal(crossStoreAttempt.code, AUTHENTICATION_RESULT.INVALID_PASSWORD);

  const inactiveStoreMember = await authenticateStoreMember(
    {
      trustedStoreId: "store-a",
      email: "inactive@example.com",
      password: "inactive-secret",
    },
    database,
  );
  assert.equal(
    inactiveStoreMember.code,
    AUTHENTICATION_RESULT.MEMBER_INACTIVE,
  );

  const missingStore = await authenticateStoreMember(
    {
      trustedStoreId: "",
      email: "admin@example.com",
      password: "store-a-secret",
    },
    database,
  );
  assert.equal(
    missingStore.code,
    AUTHENTICATION_RESULT.INVALID_STORE_CONTEXT,
  );
  assert.equal(database.calls.platformMember, 3);

  console.log("Identity authentication verification passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
