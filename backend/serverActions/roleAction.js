"use server";

import prisma from "@/lib/prisma";
import { invalidateRolePermissionCache } from "@/auth";

import { revalidatePath } from "next/cache";
import { getListCount } from "../utils/getListCount";
import { getListData } from "../utils/getListData";
import { hasPermission } from "../utils/hasPermission";
import { ACTION_KEYS, RESOURCE_KEYS, RESOURCE_REGISTRY } from "../config/resourceRegistry.mjs";
export async function getAllRoleList() {
  try {
    await hasPermission("role", "view");
    const data = await prisma.role.findMany();
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Error fetching roles:", error);
    return {
      success: false,
      message: "Failed to fetch roles",
      data: [],
    };
  }
}
export async function getRoleList(params) {
  return getListData({
    prisma,
    model: "role",
    params,
    searchableFields: [{ field: "name", type: "string", mode: "insensitive" }],
    // relationSearch: {
    //   role: {
    //     relation: "role",
    //     field: "name",
    //     type: "string",
    //     relationType: "single",
    //     exactMatch: true,
    //   },
    // },
    dateField: "createdAt",
  });
}

export async function getRoleCount(params) {
  return getListCount({
    prisma,
    model: "role",
    params,
    searchableFields: [
      { field: "name", type: "string", mode: "insensitive" },
      //   { field: "email", type: "string", mode: "insensitive" },
      //   { field: "phone", type: "string", mode: "insensitive" },
    ],
    // relationSearch: {
    //   role: {
    //     relation: "role",
    //     field: "name",
    //     relationType: "single",
    //     type: "string",
    //     exactMatch: true,
    //   },
    // },
    dateField: "createdAt",
  });
}

export async function deleteRoleById(id) {
  try {
    await hasPermission("role", "delete");

    // Delete the order by its ID
    const deletedOrder = await prisma.role.delete({
      where: {
        id: id,
      },
    });
    revalidatePath("/admin/settings/role");

    return {
      success: true,
      data: " deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting the product:", error);
    return {
      success: false,
      message: error.message || "Failed to delete ",
    };
  }
}

export async function getRolePermissionData(roleId) {
  await hasPermission("rolePermission", "view");
  // Keep the foreign-key rows in sync with the code-owned resource registry.
  // Admins can change role grants, but cannot create or delete resources here.
  await prisma.resource.createMany({
    data: RESOURCE_KEYS.map((key) => ({ key })),
    skipDuplicates: true,
  });
  await prisma.action.createMany({
    data: ACTION_KEYS.map((key) => ({ key })),
    skipDuplicates: true,
  });
  const [resources, actions, permissions] = await Promise.all([
    prisma.resource.findMany({
      where: { key: { in: RESOURCE_KEYS } },
      orderBy: { key: "asc" },
    }),
    prisma.action.findMany({
      where: { key: { in: ACTION_KEYS } },
      orderBy: { key: "asc" },
    }),
    prisma.rolePermission.findMany({
      where: { roleId },
    }),
  ]);

  const definitionByKey = new Map(RESOURCE_REGISTRY.map((item) => [item.key, item]));
  return {
    resources: resources.map((resource) => ({ ...resource, ...definitionByKey.get(resource.key) })),
    actions,
    permissions,
  };
}
export async function saveRolePermissions(roleId, matrix) {
  await hasPermission("rolePermission", "update");
  /*
    matrix structure:
    {
      resourceId: {
        actionId: true/false
      }
    }
  */

  if (!roleId || !matrix || typeof matrix !== "object" || Array.isArray(matrix)) {
    throw new Error("Invalid role permission data.");
  }

  const role = await prisma.role.findUnique({ where: { id: roleId }, select: { id: true } });
  if (!role) throw new Error("Role not found.");

  const [resources, actions] = await Promise.all([
    prisma.resource.findMany({ where: { key: { in: RESOURCE_KEYS } }, select: { id: true } }),
    prisma.action.findMany({ where: { key: { in: ACTION_KEYS } }, select: { id: true } }),
  ]);
  const validResourceIds = new Set(resources.map(({ id }) => id));
  const validActionIds = new Set(actions.map(({ id }) => id));
  const operations = [];

  for (const [resourceId, actions] of Object.entries(matrix)) {
    if (!validResourceIds.has(resourceId) || !actions || typeof actions !== "object" || Array.isArray(actions)) {
      throw new Error("Unknown resource in permission matrix.");
    }
    for (const [actionId, allowed] of Object.entries(actions)) {
      if (!validActionIds.has(actionId) || typeof allowed !== "boolean") {
        throw new Error("Invalid action permission.");
      }
      operations.push(
        prisma.rolePermission.upsert({
          where: {
            roleId_resourceId_actionId: {
              roleId,
              resourceId,
              actionId,
            },
          },
          update: {
            allowed,
          },
          create: {
            roleId,
            resourceId,
            actionId,
            allowed,
          },
        }),
      );
    }
  }

  if (operations.length) await prisma.$transaction(operations);
  invalidateRolePermissionCache(roleId);
  await prisma.user.updateMany({
    where: { roleId },
    data: { tokenVersion: { increment: 1 } },
  });

  return { success: true };
}

export async function updateUserRole(selectedItem, itemId) {
  try {
    if (!selectedItem?.id) {
      return { success: false, message: "Invalid role selected" };
    }
    await hasPermission("user", "update");
    const roleId = selectedItem.id;
    const userId = itemId;

    const data = await prisma.user.update({
      where: { id: userId },
      data: {
        role: { connect: { id: roleId } },
        tokenVersion: { increment: 1 },
      },
    });

    revalidatePath("/admin/users");

    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to update role" };
  }
}
