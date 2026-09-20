import prisma from "../../lib/prisma.js";
import { normalizeEmail } from "../utils/normalizeEmail.js";
import { verifyPassword } from "../utils/password.server.js";

export const AUTHENTICATION_RESULT = Object.freeze({
  MEMBER_NOT_FOUND: "MEMBER_NOT_FOUND",
  MEMBER_INACTIVE: "MEMBER_INACTIVE",
  INVALID_PASSWORD: "INVALID_PASSWORD",
  INVALID_STORE_CONTEXT: "INVALID_STORE_CONTEXT",
  SUCCESS: "SUCCESS",
});

const platformCredentialSelect = {
  id: true,
  roleId: true,
  passwordHash: true,
  status: true,
  tokenVersion: true,
  role: { select: { code: true, status: true } },
};

const storeCredentialSelect = {
  id: true,
  storeId: true,
  roleId: true,
  passwordHash: true,
  status: true,
  tokenVersion: true,
  role: { select: { code: true, status: true } },
};

const failed = (code) => ({ success: false, code });

export async function findPlatformMemberByEmail(email, database = prisma) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  return database.platformMember.findUnique({
    where: { normalizedEmail },
    select: platformCredentialSelect,
  });
}

export async function findStoreMemberByEmail(
  trustedStoreId,
  email,
  database = prisma,
) {
  if (typeof trustedStoreId !== "string" || !trustedStoreId.trim()) return null;
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  return database.storeMember.findUnique({
    where: {
      storeId_normalizedEmail: {
        storeId: trustedStoreId,
        normalizedEmail,
      },
    },
    select: storeCredentialSelect,
  });
}

export async function authenticatePlatformMember(
  { email, password },
  database = prisma,
) {
  const member = await findPlatformMemberByEmail(email, database);
  if (!member) return failed(AUTHENTICATION_RESULT.MEMBER_NOT_FOUND);
  if (member.status !== "ACTIVE" || member.role?.status !== "ACTIVE") {
    return failed(AUTHENTICATION_RESULT.MEMBER_INACTIVE);
  }
  if (!(await verifyPassword(password, member.passwordHash))) {
    return failed(AUTHENTICATION_RESULT.INVALID_PASSWORD);
  }

  return {
    success: true,
    code: AUTHENTICATION_RESULT.SUCCESS,
    identity: {
      type: "PLATFORM_MEMBER",
      id: member.id,
      roleId: member.roleId,
      role: member.role?.code || null,
      tokenVersion: member.tokenVersion,
    },
  };
}

/**
 * trustedStoreId must come from the server-side Store Context service. This
 * module intentionally has no request/body/query/hostname parsing fallback.
 */
export async function authenticateStoreMember(
  { trustedStoreId, email, password },
  database = prisma,
) {
  if (typeof trustedStoreId !== "string" || !trustedStoreId.trim()) {
    return failed(AUTHENTICATION_RESULT.INVALID_STORE_CONTEXT);
  }

  const member = await findStoreMemberByEmail(
    trustedStoreId,
    email,
    database,
  );
  if (!member) return failed(AUTHENTICATION_RESULT.MEMBER_NOT_FOUND);
  if (member.status !== "ACTIVE" || member.role?.status !== "ACTIVE") {
    return failed(AUTHENTICATION_RESULT.MEMBER_INACTIVE);
  }
  if (!(await verifyPassword(password, member.passwordHash))) {
    return failed(AUTHENTICATION_RESULT.INVALID_PASSWORD);
  }

  return {
    success: true,
    code: AUTHENTICATION_RESULT.SUCCESS,
    identity: {
      type: "STORE_MEMBER",
      id: member.id,
      storeId: member.storeId,
      roleId: member.roleId,
      role: member.role?.code || null,
      tokenVersion: member.tokenVersion,
    },
  };
}
