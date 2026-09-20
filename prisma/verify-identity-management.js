const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");

const now = new Date("2026-01-01T00:00:00.000Z");

function createDatabase() {
  const stores = new Map([
    ["store-a", { id: "store-a", name: "Store A", slug: "store-a", status: "ACTIVE", createdAt: now, updatedAt: now }],
    ["store-b", { id: "store-b", name: "Store B", slug: "store-b", status: "ACTIVE", createdAt: now, updatedAt: now }],
  ]);
  const storeDomains = new Map([
    ["store-a.example.com", { storeId: "store-a" }],
  ]);
  const storeRoles = new Map([
    ["role-owner-a", { id: "role-owner-a", storeId: "store-a", name: "Owner", code: "OWNER", status: "ACTIVE" }],
    ["role-admin-a", { id: "role-admin-a", storeId: "store-a", name: "Admin", code: "ADMIN", status: "ACTIVE" }],
    ["role-owner-b", { id: "role-owner-b", storeId: "store-b", name: "Owner", code: "OWNER", status: "ACTIVE" }],
  ]);
  const platformRoles = new Map([
    ["platform-super", { id: "platform-super", name: "Super Admin", code: "SUPER_ADMIN", status: "ACTIVE" }],
    ["platform-support", { id: "platform-support", name: "Support", code: "SUPPORT", status: "ACTIVE" }],
  ]);
  const storeMembers = new Map([
    ["owner-a-1", { id: "owner-a-1", storeId: "store-a", name: "Owner A1", email: "owner1@a.com", normalizedEmail: "owner1@a.com", phone: null, passwordHash: "hash", roleId: "role-owner-a", status: "ACTIVE", tokenVersion: 0, createdAt: now, updatedAt: now }],
    ["owner-a-2", { id: "owner-a-2", storeId: "store-a", name: "Owner A2", email: "owner2@a.com", normalizedEmail: "owner2@a.com", phone: null, passwordHash: "hash", roleId: "role-owner-a", status: "ACTIVE", tokenVersion: 0, createdAt: now, updatedAt: now }],
    ["owner-b-1", { id: "owner-b-1", storeId: "store-b", name: "Owner B", email: "owner@b.com", normalizedEmail: "owner@b.com", phone: null, passwordHash: "hash", roleId: "role-owner-b", status: "ACTIVE", tokenVersion: 0, createdAt: now, updatedAt: now }],
  ]);
  const platformMembers = new Map([
    ["super-1", { id: "super-1", name: "Super One", email: "super1@shopz.com", normalizedEmail: "super1@shopz.com", phone: null, passwordHash: "hash", roleId: "platform-super", status: "ACTIVE", tokenVersion: 0, createdAt: now, updatedAt: now }],
    ["super-2", { id: "super-2", name: "Super Two", email: "super2@shopz.com", normalizedEmail: "super2@shopz.com", phone: null, passwordHash: "hash", roleId: "platform-super", status: "ACTIVE", tokenVersion: 0, createdAt: now, updatedAt: now }],
  ]);

  const storeRole = (id) => storeRoles.get(id);
  const platformRole = (id) => platformRoles.get(id);
  const safeStoreMember = (member) => {
    if (!member) return null;
    const { passwordHash: _passwordHash, normalizedEmail: _normalizedEmail, tokenVersion: _tokenVersion, ...safe } = member;
    return { ...safe, role: storeRole(member.roleId) };
  };
  const safePlatformMember = (member) => {
    if (!member) return null;
    const { passwordHash: _passwordHash, normalizedEmail: _normalizedEmail, tokenVersion: _tokenVersion, ...safe } = member;
    return { ...safe, role: platformRole(member.roleId) };
  };
  const duplicate = () => Object.assign(new Error("Unique constraint"), { code: "P2002" });

  return {
    records: { stores, storeMembers, platformMembers },
    store: {
      async findUnique({ where }) { return stores.get(where.id) || null; },
      async create({ data }) {
        if ([...stores.values()].some((store) => store.slug === data.slug)) throw duplicate();
        const record = { id: `store-${stores.size + 1}`, ...data, createdAt: now, updatedAt: now };
        stores.set(record.id, record);
        return record;
      },
      async update({ where, data }) {
        const record = { ...stores.get(where.id), ...data, updatedAt: now };
        stores.set(where.id, record);
        return record;
      },
    },
    storeDomain: {
      async findUnique({ where }) {
        const domain = storeDomains.get(where.domain);
        return domain ? { store: stores.get(domain.storeId) } : null;
      },
    },
    storeRole: {
      async findFirst({ where }) {
        const role = storeRoles.get(where.id);
        return role && role.storeId === where.storeId && role.status === where.status
          ? { id: role.id, code: role.code }
          : null;
      },
    },
    storeMember: {
      async findFirst({ where }) {
        const member = storeMembers.get(where.id);
        return member && member.storeId === where.storeId
          ? safeStoreMember(member)
          : null;
      },
      async findMany({ where }) {
        return [...storeMembers.values()]
          .filter((member) => member.storeId === where.storeId)
          .map(safeStoreMember);
      },
      async create({ data }) {
        if ([...storeMembers.values()].some((member) => member.storeId === data.storeId && member.normalizedEmail === data.normalizedEmail)) throw duplicate();
        const record = { id: `store-member-${storeMembers.size + 1}`, ...data, tokenVersion: 0, createdAt: now, updatedAt: now };
        storeMembers.set(record.id, record);
        return safeStoreMember(record);
      },
      async update({ where, data }) {
        const current = storeMembers.get(where.id);
        const record = {
          ...current,
          ...data,
          tokenVersion: data.tokenVersion?.increment
            ? current.tokenVersion + data.tokenVersion.increment
            : current.tokenVersion,
          updatedAt: now,
        };
        storeMembers.set(where.id, record);
        return safeStoreMember(record);
      },
      async count({ where }) {
        return [...storeMembers.values()].filter((member) => {
          const role = storeRole(member.roleId);
          return member.storeId === where.storeId && member.id !== where.id.not && member.status === "ACTIVE" && role?.code === "OWNER" && role.storeId === where.storeId && role.status === "ACTIVE";
        }).length;
      },
    },
    platformRole: {
      async findFirst({ where }) {
        const role = platformRoles.get(where.id);
        return role && role.status === where.status
          ? { id: role.id, code: role.code }
          : null;
      },
    },
    platformMember: {
      async findUnique({ where }) { return safePlatformMember(platformMembers.get(where.id)); },
      async findMany() { return [...platformMembers.values()].map(safePlatformMember); },
      async create({ data }) {
        if ([...platformMembers.values()].some((member) => member.normalizedEmail === data.normalizedEmail)) throw duplicate();
        const record = { id: `platform-member-${platformMembers.size + 1}`, ...data, tokenVersion: 0, createdAt: now, updatedAt: now };
        platformMembers.set(record.id, record);
        return safePlatformMember(record);
      },
      async update({ where, data }) {
        const current = platformMembers.get(where.id);
        const record = {
          ...current,
          ...data,
          tokenVersion: data.tokenVersion?.increment
            ? current.tokenVersion + data.tokenVersion.increment
            : current.tokenVersion,
          updatedAt: now,
        };
        platformMembers.set(where.id, record);
        return safePlatformMember(record);
      },
      async count({ where }) {
        return [...platformMembers.values()].filter((member) => {
          const role = platformRole(member.roleId);
          return member.id !== where.id.not && member.status === "ACTIVE" && role?.code === "SUPER_ADMIN" && role.status === "ACTIVE";
        }).length;
      },
    },
  };
}

const allow = async () => true;
const deny = async () => { throw new Error("Unauthorized"); };
const context = (storeId) => async () => ({ type: "STORE", store: { id: storeId } });

async function main() {
  const storeService = await import("../backend/services/storeManagement.server.js");
  const storeMemberService = await import("../backend/services/storeMemberManagement.server.js");
  const platformMemberService = await import("../backend/services/platformMemberManagement.server.js");
  const database = createDatabase();

  const platformOptions = { database, requirePermission: allow };
  assert.equal((await storeService.getStoreById("store-a", platformOptions)).id, "store-a");
  assert.equal((await storeService.getStoreByDomain("WWW.Store-A.Example.com:443", platformOptions)).id, "store-a");
  const createdStore = await storeService.createStore({ name: "Store C", slug: "store-c" }, platformOptions);
  assert.equal(createdStore.status, "ACTIVE");
  assert.equal((await storeService.updateStore(createdStore.id, { name: "Store C Updated" }, platformOptions)).name, "Store C Updated");
  await assert.rejects(storeService.createStore({ name: "Denied", slug: "denied" }, { database, requirePermission: deny }), /Unauthorized/);

  const storeAOptions = { database, requirePermission: allow, getStoreContext: context("store-a") };
  const storeBOptions = { database, requirePermission: allow, getStoreContext: context("store-b") };
  const storeAList = await storeMemberService.listStoreMembers({}, storeAOptions);
  assert.equal(storeAList.data.every((member) => member.storeId === "store-a"), true);
  assert.equal("passwordHash" in storeAList.data[0], false);

  const memberA = await storeMemberService.createStoreMember({
    name: "Shared Email A",
    email: " Shared@Example.com ",
    password: "safe-password-a",
    roleId: "role-admin-a",
  }, storeAOptions);
  assert.equal(memberA.storeId, "store-a");
  assert.equal("passwordHash" in memberA, false);
  assert.equal(await bcrypt.compare("safe-password-a", database.records.storeMembers.get(memberA.id).passwordHash), true);
  await assert.rejects(storeMemberService.createStoreMember({
    name: "Duplicate Email",
    email: "shared@example.com",
    password: "safe-password-b",
    roleId: "role-admin-a",
  }, storeAOptions), /already exists/);

  const memberB = await storeMemberService.createStoreMember({
    name: "Shared Email B",
    email: "shared@example.com",
    password: "safe-password-b",
    roleId: "role-owner-b",
  }, storeBOptions);
  assert.equal(memberB.storeId, "store-b");
  assert.equal(await storeMemberService.getStoreMemberById(memberB.id, storeAOptions), null);
  await assert.rejects(storeMemberService.updateStoreMemberRole(memberA.id, "role-owner-b", storeAOptions), /unavailable/);
  assert.equal((await storeMemberService.updateStoreMemberRole(memberA.id, "role-owner-a", storeAOptions)).roleId, "role-owner-a");
  assert.equal((await storeMemberService.updateStoreMemberStatus(memberA.id, "INACTIVE", storeAOptions)).status, "INACTIVE");
  await assert.rejects(storeMemberService.listStoreMembers({}, { ...storeAOptions, requirePermission: deny }), /Unauthorized/);

  const platformList = await platformMemberService.listPlatformMembers({}, platformOptions);
  assert.equal("passwordHash" in platformList.data[0], false);
  const platformMember = await platformMemberService.createPlatformMember({
    name: "Support Member",
    email: " Support@Shopz.com ",
    password: "platform-password",
    roleId: "platform-support",
  }, platformOptions);
  assert.equal("passwordHash" in platformMember, false);
  assert.equal(await bcrypt.compare("platform-password", database.records.platformMembers.get(platformMember.id).passwordHash), true);
  assert.equal((await platformMemberService.updatePlatformMemberRole(platformMember.id, "platform-super", platformOptions)).roleId, "platform-super");
  assert.equal((await platformMemberService.updatePlatformMemberStatus(platformMember.id, "INACTIVE", platformOptions)).status, "INACTIVE");
  await assert.rejects(platformMemberService.updatePlatformMemberRole("super-1", "role-owner-a", platformOptions), /unavailable/);
  await assert.rejects(platformMemberService.listPlatformMembers({}, { database, requirePermission: deny }), /Unauthorized/);

  console.log("Identity management verification passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
