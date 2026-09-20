import prisma from "../../lib/prisma.js";
import { normalizeEmail } from "../utils/normalizeEmail.js";
import { hashPassword } from "../utils/password.server.js";
import { requirePlatformPermission } from "./identityAuthorization.server.js";

const MEMBER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  roleId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  role: { select: { id: true, name: true, code: true } },
};

const dependencies = (options = {}) => ({
  database: options.database || prisma,
  authorize: options.requirePermission || requirePlatformPermission,
  authorizationOptions: options.authorizationOptions,
});

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

async function activePlatformRole(database, roleId) {
  if (typeof roleId !== "string" || !roleId.trim()) {
    throw new Error("Platform role is required.");
  }
  const role = await database.platformRole.findFirst({
    where: { id: roleId, status: "ACTIVE" },
    select: { id: true, code: true },
  });
  if (!role) throw new Error("The selected Platform role is unavailable.");
  return role;
}

async function ensureAnotherSuperAdmin(database, memberId) {
  const superAdmins = await database.platformMember.count({
    where: {
      id: { not: memberId },
      status: "ACTIVE",
      role: { code: "SUPER_ADMIN", status: "ACTIVE" },
    },
  });
  if (superAdmins < 1) {
    throw new Error("The platform must retain an active SUPER_ADMIN.");
  }
}

export async function getPlatformMemberById(id, options) {
  const dependency = dependencies(options);
  await dependency.authorize(
    "PLATFORM",
    "VIEW",
    dependency.authorizationOptions,
  );
  if (typeof id !== "string" || !id.trim()) return null;
  return dependency.database.platformMember.findUnique({
    where: { id },
    select: MEMBER_SELECT,
  });
}

export async function listPlatformMembers(
  { cursor = null, limit = 25 } = {},
  options,
) {
  const dependency = dependencies(options);
  await dependency.authorize(
    "PLATFORM",
    "VIEW",
    dependency.authorizationOptions,
  );
  const take = Math.min(100, Math.max(1, Number(limit) || 25));
  const members = await dependency.database.platformMember.findMany({
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

export async function createPlatformMember(input, options) {
  const dependency = dependencies(options);
  await dependency.authorize(
    "PLATFORM",
    "MANAGE",
    dependency.authorizationOptions,
  );
  const normalizedEmail = normalizeEmail(input?.email);
  if (!normalizedEmail) throw new Error("Member email is required.");
  const role = await activePlatformRole(
    dependency.database,
    input?.roleId,
  );
  const passwordHash = await hashPassword(input?.password);

  try {
    return await dependency.database.platformMember.create({
      data: {
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
      throw new Error("A Platform member with this email already exists.");
    }
    throw error;
  }
}

export async function updatePlatformMemberStatus(id, status, options) {
  const dependency = dependencies(options);
  await dependency.authorize(
    "PLATFORM",
    "MANAGE",
    dependency.authorizationOptions,
  );
  const nextStatus = cleanStatus(status);
  const member = await dependency.database.platformMember.findUnique({
    where: { id },
    select: { id: true, status: true, role: { select: { code: true } } },
  });
  if (!member) throw new Error("Platform member was not found.");
  if (
    member.status === "ACTIVE" &&
    member.role.code === "SUPER_ADMIN" &&
    nextStatus === "INACTIVE"
  ) {
    await ensureAnotherSuperAdmin(dependency.database, member.id);
  }
  return dependency.database.platformMember.update({
    where: { id: member.id },
    data: { status: nextStatus, tokenVersion: { increment: 1 } },
    select: MEMBER_SELECT,
  });
}

export async function updatePlatformMemberRole(id, roleId, options) {
  const dependency = dependencies(options);
  await dependency.authorize(
    "PLATFORM",
    "MANAGE",
    dependency.authorizationOptions,
  );
  const [member, role] = await Promise.all([
    dependency.database.platformMember.findUnique({
      where: { id },
      select: { id: true, status: true, role: { select: { code: true } } },
    }),
    activePlatformRole(dependency.database, roleId),
  ]);
  if (!member) throw new Error("Platform member was not found.");
  if (
    member.status === "ACTIVE" &&
    member.role.code === "SUPER_ADMIN" &&
    role.code !== "SUPER_ADMIN"
  ) {
    await ensureAnotherSuperAdmin(dependency.database, member.id);
  }
  return dependency.database.platformMember.update({
    where: { id: member.id },
    data: { roleId: role.id, tokenVersion: { increment: 1 } },
    select: MEMBER_SELECT,
  });
}
