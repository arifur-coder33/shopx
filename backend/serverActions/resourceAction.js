"use server";

import prisma from "@/lib/prisma";

import { getListCount } from "../utils/getListCount";
import { getListData } from "../utils/getListData";
export async function getResourceList(params) {
  return getListData({
    prisma,
    model: "resource",
    params,
    searchableFields: [{ field: "key", type: "string", mode: "insensitive" }],
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

export async function getResourceCount(params) {
  return getListCount({
    prisma,
    model: "resource",
    params,
    searchableFields: [
      { field: "key", type: "string", mode: "insensitive" },
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
export async function deleteResourceById(id) {
  try {
    // Delete the order by its ID
    const deletedOrder = await prisma.resource.delete({
      where: {
        id: id,
      },
    });
    revalidatePath("/admin/settings/resource");

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
export async function getResourceById(id) {
  try {
    const data = await prisma.resource.findUnique({
      where: { id },
    });
    return { success: true, data }; // Return success with user data
  } catch (error) {
    return { success: false, error: error.message }; // Return structured error
  }
}

export async function createResourceAction(formData) {
  const data = Object.fromEntries(formData.entries());

  try {
    const preparedData = {
      ...data,
    };
    if (!data?.name) {
      throw new Error("সব ফিল্ড গুলতে তথ্য দিন।");
    }
    const checkSlug = await prisma.resource.findUnique({
      where: { name: data?.name },
    });

    if (checkSlug) {
      throw new Error("This Already Availabe ");
    }

    // }

    const details = await prisma.variationName.create({
      data: preparedData,
    });

    revalidatePath("admin/settings/resources");

    return { success: true, data: details }; // Return success with user data
  } catch (error) {
    console.log(error.message);
    return { success: false, error: error.message }; // Return structured error
  }
}

export async function updateResourceAction({ formData, id }) {
  const data = Object.fromEntries(formData.entries());

  try {
    const preparedData = {
      ...data,
    };
    if (!data?.name) {
      throw new Error("সব ফিল্ড গুলতে তথ্য দিন।");
    }
    const checkData = await prisma.resource.findUnique({
      where: { id },
    });

    if (!checkData) {
      throw new Error("Invalide id");
    }
    const saveData = await prisma.resource.update({
      where: { id },
      data: preparedData,
    });
    // }

    revalidatePath("admin/settings/resources");
    return { success: true, data: saveData }; // Return success with user data
  } catch (error) {
    console.log(error.message);
    return { success: false, error: error.message }; // Return structured error
  }
}
