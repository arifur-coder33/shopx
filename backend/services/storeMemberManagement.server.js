import prisma from "../../lib/prisma.js";
import { normalizeEmail } from "../utils/normalizeEmail.js";
import { hashPassword } from "../utils/password.server.js";
import { requireStorePermission } from "./identityAuthorization.server.js";
import { getCurrentStoreContext } from "./storeContextService.js";

const MEMBER_SELECT = {
  id: true,
  storeId: true,
  name: true,
  email: true,
  phone: true,
  roleId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  role: { select: { id: true, name: true, code: true } },
};

const cleanName = (value) => {
  const name = String(value || "").trim();
  if (name.length < 2 || name.length > 120) {
    throw new Error("Member name must be between 2 and 120 characters.");
  }
  return name;
};

const cleanStatus = (value) => {
  if (!['ACTIVE', 'INACTIVE'].includes(value)) {
    throw new Error("Member status is invalid.");
  }
  return value;
};

async function scopedDependencies(action, options = {}) {
  const database = options.database || prisma;
  const getStoreContext = options.getStoreContext || getCurrentStoreContext;
  const context = await getStoreContext();
  if (context?.type !== "STORE" || !context.store?.id) {
    throw new Error("Trusted Store context is required.");
  }
  const authorize = options.requirePermission || requireStorePermission;
  await authorize("STAFF", action, {
    ...options.authorizationOptions,
    database,
    getStoreContext: async () => context,
  });
  return { database, storeId: context.store.id };
}

async function activeStoreRole(database, storeId, roleId) {
  if (typeof roleId !== "string" || !roleId.trim()) {
    throw new Error("Store role is required.");
  }
  const role = await database.storeRole.findFirst({
    where: { id: roleId, storeId, status: "ACTIVE" },
    select: { id: true, code: true },
  });
  if (!role) throw new Error("The selected Store role is unavailable.");
  return role;
}

async function ensureAnotherOwner(database, storeId, memberId) {
  const owners = await database.storeMember.count({
    where: {
      storeId,
      id: { not: memberId },
      status: "ACTIVE",
      role: { code: "OWNER", storeId, status: "ACTIVE" },
    },
  });
  if (owners < 1) throw new Error("A Store must retain an active OWNER.");
}

export async function getStoreMemberById(id, options) {
  const { database, storeId } = await scopedDependencies("VIEW", options);
  if (typeof id !== "string" || !id.trim()) return null;
  return database.storeMember.findFirst({
    where: { id, storeId },
    select: MEMBER_SELECT,
  });
}

export async function listStoreMembers(
  { cursor = null, limit = 25 } = {},
  options,
) {
  const { database, storeId } = await scopedDependencies("VIEW", options);
  const take = Math.min(100, Math.max(1, Number(limit) || 25));
  const members = await database.storeMember.findMany({
    where: { storeId },
    select: MEMBER_SELECT,
    orderBy: { id: "asc" },
    take: take + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
  });
  const hasMore = members.length > take;
  const data = hasMore ? members.slice(0, take) : members;
  return {
    data,
    nextCursor: hasMore ? data[data.length - 1].id : null,
  };
}

export async function createStoreMember(input, options) {
  const { database, storeId } = await scopedDependencies("MANAGE", options);
  const normalizedEmail = normalizeEmail(input?.email);
  if (!normalizedEmail) throw new Error("Member email is required.");
  const role = await activeStoreRole(database, storeId, input?.roleId);
  const passwordHash = await hashPassword(input?.password);

  try {
    return await database.storeMember.create({
      data: {
        storeId,
        name: cleanName(input?.name),
        email: normalizedEmail,
        normalizedEmail,
        phone: String(input?.phone || "").trim() || null,
        passwordHash,
        roleId: role.id,
        status: "ACTIVE",
      },
      select: MEMBER_SELECT,
    });
  } catch (error) {
    if (error?.code === "P2002") {
      throw new Error("A member with this email already exists in this Store.");
    }
    throw error;
  }
}

export async function updateStoreMemberStatus(id, status, options) {
  const { database, storeId } = await scopedDependencies("MANAGE", options);
  const nextStatus = cleanStatus(status);
  const member = await database.storeMember.findFirst({
    where: { id, storeId },
    select: { id: true, status: true, role: { select: { code: true } } },
  });
  if (!member) throw new Error("Store member was not found.");
  if (
    member.status === "ACTIVE" &&
    member.role.code === "OWNER" &&
    nextStatus === "INACTIVE"
  ) {
    await ensureAnotherOwner(database, storeId, member.id);
  }
  return database.storeMember.update({
    where: { id: member.id },
    data: { status: nextStatus, tokenVersion: { increment: 1 } },
    select: MEMBER_SELECT,
  });
}

export async function updateStoreMemberRole(id, roleId, options) {
  const { database, storeId } = await scopedDependencies("MANAGE", options);
  const [member, role] = await Promise.all([
    database.storeMember.findFirst({
      where: { id, storeId },
      select: { id: true, status: true, role: { select: { code: true } } },
    }),
    activeStoreRole(database, storeId, roleId),
  ]);
  if (!member) throw new Error("Store member was not found.");
  if (
    member.status === "ACTIVE" &&
    member.role.code === "OWNER" &&
    role.code !== "OWNER"
  ) {
    await ensureAnotherOwner(database, storeId, member.id);
  }
  return database.storeMember.update({
    where: { id: member.id },
    data: { roleId: role.id, tokenVersion: { increment: 1 } },
    select: MEMBER_SELECT,
  });
}
