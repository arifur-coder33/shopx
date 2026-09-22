import identitySeed from "../../prisma/seed-identity-foundation.js";
import prisma from "../../lib/prisma.js";
import { normalizeEmail } from "../utils/normalizeEmail.js";
import { hashPassword } from "../utils/password.server.js";
import { requirePlatformPermission } from "./identityAuthorization.server.js";
import { normalizeStoreCreateInput } from "./storeManagement.server.js";

const { STORE_PERMISSIONS, STORE_ROLES } = identitySeed;

const STORE_SELECT = {
  id: true,
  name: true,
  slug: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

const OWNER_SELECT = {
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

export class StoreProvisioningError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "StoreProvisioningError";
    this.code = code;
  }
}

const normalizeOwnerInput = (owner) => {
  const name = String(owner?.name || "").trim();
  const normalizedEmail = normalizeEmail(owner?.email);
  if (name.length < 2 || name.length > 120) {
    throw new StoreProvisioningError(
      "INVALID_OWNER",
      "Owner name must be between 2 and 120 characters.",
    );
  }
  if (
    !normalizedEmail ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
  ) {
    throw new StoreProvisioningError(
      "INVALID_OWNER",
      "Owner email is invalid.",
    );
  }
  return {
    name,
    email: normalizedEmail,
    normalizedEmail,
    phone: String(owner?.phone || "").trim() || null,
    password: owner?.password,
  };
};

export async function provisionStore(input, options = {}) {
  const database = options.database || prisma;
  const authorize = options.requirePermission || requirePlatformPermission;
  await authorize("STORES", "MANAGE", options.authorizationOptions);

  const storeInput = normalizeStoreCreateInput(input?.store);
  const ownerInput = normalizeOwnerInput(input?.owner);
  const passwordHash = await hashPassword(ownerInput.password);

  try {
    return await database.$transaction(async (tx) => {
      const store = await tx.store.create({
        data: storeInput,
        select: STORE_SELECT,
      });

      const roles = new Map();
      for (const roleDefinition of STORE_ROLES) {
        const role = await tx.storeRole.create({
          data: {
            storeId: store.id,
            name: roleDefinition.name,
            code: roleDefinition.code,
            status: "ACTIVE",
          },
          select: { id: true, storeId: true, name: true, code: true },
        });
        roles.set(role.code, role);
      }

      for (const [roleCode, permissions] of Object.entries(STORE_PERMISSIONS)) {
        const role = roles.get(roleCode);
        for (const [resource, action] of permissions) {
          await tx.storeRolePermission.create({
            data: { roleId: role.id, resource, action },
            select: { id: true },
          });
        }
      }

      const ownerRole = roles.get("OWNER");
      const owner = await tx.storeMember.create({
        data: {
          storeId: store.id,
          name: ownerInput.name,
          email: ownerInput.email,
          normalizedEmail: ownerInput.normalizedEmail,
          phone: ownerInput.phone,
          passwordHash,
          roleId: ownerRole.id,
          status: "ACTIVE",
        },
        select: OWNER_SELECT,
      });

      return { store, owner };
    }, { timeout: 30000 });
  } catch (error) {
    if (error?.code === "P2002") {
      throw new StoreProvisioningError(
        "STORE_CONFLICT",
        "The Store slug or Store-scoped owner email already exists.",
      );
    }
    throw error;
  }
}
