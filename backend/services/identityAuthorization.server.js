import prisma from "../../lib/prisma.js";
import { getCurrentStoreContext } from "./storeContextService.js";

export class IdentityAuthorizationError extends Error {
  constructor(code) {
    super(code === "UNAUTHENTICATED" ? "Unauthenticated" : "Unauthorized");
    this.name = "IdentityAuthorizationError";
    this.code = code;
  }
}

const permissionInput = (resource, action) => {
  const normalizedResource = String(resource || "").trim();
  const normalizedAction = String(action || "").trim();
  return normalizedResource && normalizedAction
    ? { resource: normalizedResource, action: normalizedAction }
    : null;
};

async function readPlatformSession() {
  const { platformAuth } = await import("../../auth/platform.js");
  return platformAuth();
}

async function readStoreSession() {
  const { storeAuth } = await import("../../auth/store.js");
  return storeAuth();
}

async function checkPlatformPermission(
  resource,
  action,
  { database = prisma, getSession = readPlatformSession } = {},
) {
  const permission = permissionInput(resource, action);
  if (!permission) return { allowed: false, reason: "INVALID_PERMISSION" };

  const session = await getSession();
  const identity = session?.user;
  if (!identity) return { allowed: false, reason: "UNAUTHENTICATED" };
  if (
    identity.identityType !== "PLATFORM_MEMBER" ||
    !identity.platformMemberId ||
    !identity.roleId
  ) {
    return { allowed: false, reason: "WRONG_IDENTITY" };
  }

  const member = await database.platformMember.findFirst({
    where: {
      id: identity.platformMemberId,
      roleId: identity.roleId,
      status: "ACTIVE",
    },
    select: {
      id: true,
      role: {
        select: {
          id: true,
          status: true,
          permissions: {
            where: permission,
            take: 1,
            select: { id: true },
          },
        },
      },
    },
  });

  const allowed =
    member?.role?.status === "ACTIVE" &&
    member.role.permissions.length === 1;
  return { allowed, reason: allowed ? null : "FORBIDDEN" };
}

async function checkStorePermission(
  resource,
  action,
  {
    database = prisma,
    getSession = readStoreSession,
    getStoreContext = getCurrentStoreContext,
  } = {},
) {
  const permission = permissionInput(resource, action);
  if (!permission) return { allowed: false, reason: "INVALID_PERMISSION" };

  const session = await getSession();
  const identity = session?.user;
  if (!identity) return { allowed: false, reason: "UNAUTHENTICATED" };
  if (
    identity.identityType !== "STORE_MEMBER" ||
    !identity.storeMemberId ||
    !identity.storeId ||
    !identity.roleId
  ) {
    return { allowed: false, reason: "WRONG_IDENTITY" };
  }

  const context = await getStoreContext();
  if (
    context?.type !== "STORE" ||
    !context.store?.id ||
    context.store.id !== identity.storeId
  ) {
    return { allowed: false, reason: "INVALID_STORE_CONTEXT" };
  }

  const member = await database.storeMember.findFirst({
    where: {
      id: identity.storeMemberId,
      storeId: context.store.id,
      roleId: identity.roleId,
      status: "ACTIVE",
    },
    select: {
      id: true,
      role: {
        select: {
          id: true,
          storeId: true,
          status: true,
          permissions: {
            where: permission,
            take: 1,
            select: { id: true },
          },
        },
      },
    },
  });

  const allowed =
    member?.role?.storeId === context.store.id &&
    member.role.status === "ACTIVE" &&
    member.role.permissions.length === 1;
  return { allowed, reason: allowed ? null : "FORBIDDEN" };
}

export async function hasPlatformPermission(resource, action, options) {
  const result = await checkPlatformPermission(resource, action, options);
  return result.allowed;
}

export async function requirePlatformPermission(resource, action, options) {
  const result = await checkPlatformPermission(resource, action, options);
  if (!result.allowed) {
    throw new IdentityAuthorizationError(
      result.reason === "UNAUTHENTICATED" ? "UNAUTHENTICATED" : "FORBIDDEN",
    );
  }
  return true;
}

export async function hasStorePermission(resource, action, options) {
  const result = await checkStorePermission(resource, action, options);
  return result.allowed;
}

export async function requireStorePermission(resource, action, options) {
  const result = await checkStorePermission(resource, action, options);
  if (!result.allowed) {
    throw new IdentityAuthorizationError(
      result.reason === "UNAUTHENTICATED" ? "UNAUTHENTICATED" : "FORBIDDEN",
    );
  }
  return true;
}
