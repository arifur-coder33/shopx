const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");

function identityDatabase({ platformPassword, storeAPassword, storeBPassword }) {
  const calls = { platform: 0, store: 0 };
  const platformMembers = new Map([
    [
      "platform@example.com",
      {
        id: "platform-member",
        roleId: "platform-role",
        passwordHash: platformPassword,
        status: "ACTIVE",
        tokenVersion: 2,
        role: { code: "PLATFORM_ADMIN", status: "ACTIVE" },
      },
    ],
  ]);
  const storeMembers = new Map([
    [
      "store-a:admin@example.com",
      {
        id: "store-member-a",
        storeId: "store-a",
        roleId: "store-role-a",
        passwordHash: storeAPassword,
        status: "ACTIVE",
        tokenVersion: 1,
        role: { code: "OWNER", status: "ACTIVE" },
      },
    ],
    [
      "store-b:admin@example.com",
      {
        id: "store-member-b",
        storeId: "store-b",
        roleId: "store-role-b",
        passwordHash: storeBPassword,
        status: "ACTIVE",
        tokenVersion: 4,
        role: { code: "ADMIN", status: "ACTIVE" },
      },
    ],
  ]);

  return {
    calls,
    platformMember: {
      async findUnique({ where }) {
        calls.platform += 1;
        return platformMembers.get(where.normalizedEmail) || null;
      },
    },
    storeMember: {
      async findUnique({ where }) {
        calls.store += 1;
        const key = where.storeId_normalizedEmail;
        return storeMembers.get(`${key.storeId}:${key.normalizedEmail}`) || null;
      },
    },
  };
}

async function main() {
  const {
    authorizePlatformCredentials,
    authorizeStoreCredentials,
    createIdentityAuthCookies,
    platformJwtCallback,
    platformSessionCallback,
    storeJwtCallback,
    storeSessionCallback,
  } = await import("../backend/services/identitySession.server.js");

  const database = identityDatabase({
    platformPassword: await bcrypt.hash("platform-password", 4),
    storeAPassword: await bcrypt.hash("store-a-password", 4),
    storeBPassword: await bcrypt.hash("store-b-password", 4),
  });

  const platformIdentity = await authorizePlatformCredentials(
    { email: " Platform@Example.com ", password: "platform-password" },
    database,
  );
  assert.equal(platformIdentity.type, "PLATFORM_MEMBER");
  assert.equal(database.calls.platform, 1);
  assert.equal(database.calls.store, 0);

  const platformToken = await platformJwtCallback({
    token: {},
    user: platformIdentity,
  });
  const platformSession = await platformSessionCallback({
    session: { expires: "future" },
    token: platformToken,
  });
  assert.equal(platformSession.user.identityType, "PLATFORM_MEMBER");
  assert.equal(platformSession.user.platformMemberId, "platform-member");
  assert.equal("passwordHash" in platformSession.user, false);
  assert.equal("storeId" in platformSession.user, false);

  const credentialsWithUntrustedStoreId = {
    email: "admin@example.com",
    password: "store-a-password",
    storeId: "store-b",
  };
  const storeAIdentity = await authorizeStoreCredentials(
    credentialsWithUntrustedStoreId,
    {
      database,
      resolveTrustedStoreContext: async () => ({
        type: "STORE",
        store: { id: "store-a" },
      }),
    },
  );
  assert.equal(storeAIdentity.id, "store-member-a");
  assert.equal(storeAIdentity.storeId, "store-a");
  assert.equal(database.calls.platform, 1);

  const crossStoreAttempt = await authorizeStoreCredentials(
    { email: "admin@example.com", password: "store-b-password" },
    {
      database,
      resolveTrustedStoreContext: async () => ({
        type: "STORE",
        store: { id: "store-a" },
      }),
    },
  );
  assert.equal(crossStoreAttempt, null);

  const invalidStoreContext = await authorizeStoreCredentials(
    { email: "admin@example.com", password: "store-a-password" },
    {
      database,
      resolveTrustedStoreContext: async () => ({
        type: "PLATFORM",
        store: null,
      }),
    },
  );
  assert.equal(invalidStoreContext, null);

  const storeToken = await storeJwtCallback({ token: {}, user: storeAIdentity });
  const storeSession = await storeSessionCallback({
    session: { expires: "future" },
    token: storeToken,
  });
  assert.equal(storeSession.user.identityType, "STORE_MEMBER");
  assert.equal(storeSession.user.storeMemberId, "store-member-a");
  assert.equal(storeSession.user.storeId, "store-a");
  assert.equal("passwordHash" in storeSession.user, false);
  assert.equal("platformMemberId" in storeSession.user, false);

  const platformCookies = createIdentityAuthCookies("platform");
  const storeCookies = createIdentityAuthCookies("store");
  assert.notEqual(
    platformCookies.sessionToken.name,
    storeCookies.sessionToken.name,
  );
  assert.notEqual(platformCookies.csrfToken.name, storeCookies.csrfToken.name);

  console.log("Identity session verification passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
