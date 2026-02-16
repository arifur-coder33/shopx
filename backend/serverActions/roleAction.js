"use server";

import prisma from "@/lib/prisma";

import { revalidatePath } from "next/cache";
import { getListCount } from "../utils/getListCount";
import { getListData } from "../utils/getListData";
import { hasPermission } from "../utils/hasPermission";
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
  } finally {
    await prisma.$disconnect();
  }
}

export async function getRolePermissionData(roleId) {
  const [resources, actions, permissions] = await Promise.all([
    prisma.resource.findMany({
      orderBy: { key: "asc" },
    }),
    prisma.action.findMany({
      orderBy: { key: "asc" },
    }),
    prisma.rolePermission.findMany({
      where: { roleId },
    }),
  ]);

  return { resources, actions, permissions };
}
export async function saveRolePermissions(roleId, matrix) {
  /*
    matrix structure:
    {
      resourceId: {
        actionId: true/false
      }
    }
  */

  const operations = [];

  for (const [resourceId, actions] of Object.entries(matrix)) {
    for (const [actionId, allowed] of Object.entries(actions)) {
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

  await prisma.$transaction(operations);

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
      data: { role: { connect: { id: roleId } } },
    });

    revalidatePath("/admin/users");

    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to update role" };
  }
}
