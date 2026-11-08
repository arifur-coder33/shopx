"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getDataSelectFields } from "../utils/getDataSelectFields";
import { getCategorySizeSettings, sizeVariationFilter } from "../services/sizeChartService";

export async function createVariationAction(formData) {
  const data = Object.fromEntries(formData.entries());

  try {
    const preparedData = {
      ...data,
    };
    if (!data?.name) {
      throw new Error("সব ফিল্ড গুলতে তথ্য দিন।");
    }
    const checkSlug = await prisma.variationName.findUnique({
      where: { name: data?.name },
    });

    if (checkSlug) {
      throw new Error("This Already Availabe ");
    }

    // }

    const details = await prisma.variationName.create({
      data: preparedData,
    });

    revalidatePath("/admin/variation");

    return { success: true, data: details }; // Return success with user data
  } catch (error) {
    console.log(error.message);
    return { success: false, error: error.message }; // Return structured error
  }
}

export async function getVariations() {
  try {
    const data = await prisma.variationName.findMany();

    return { success: true, data }; // Return success with user data
  } catch (error) {
    return { success: false, error: error.message }; // Return structured error
  }
}

export async function updateVariationAction({ formData, id }) {
  const data = Object.fromEntries(formData.entries());

  try {
    const preparedData = {
      ...data,
    };
    if (!data?.name) {
      throw new Error("সব ফিল্ড গুলতে তথ্য দিন।");
    }
    const checkData = await prisma.variationName.findUnique({
      where: { id },
    });

    if (!checkData) {
      throw new Error("Invalide id");
    }
    if (checkData.name.toLowerCase() === "size" && data.name.toLowerCase() !== "size") {
      throw new Error("Size is the default variation for size charts.");
    }
    const saveData = await prisma.variationName.update({
      where: { id },
      data: preparedData,
    });
    // }

    revalidatePath("/admin/variation");
    return { success: true, data: saveData }; // Return success with user data
  } catch (error) {
    console.log(error.message);
    return { success: false, error: error.message }; // Return structured error
  }
}

export async function deleteVariationAction(id) {
  try {
    const size = await prisma.variationName.findFirst({ where: { id, ...sizeVariationFilter }, select: { id: true } });
    if (size) throw new Error("The default Size variation cannot be deleted.");
    const deleteItem = await prisma?.variationName?.delete({
      where: { id },
    });
    revalidatePath("/admin/variation");
    return { success: true, data: "Successfuully deleted" }; // Return success with user data
  } catch (error) {
    console.log(error.message);
    return { success: false, error: error.message }; // Return structured error
  }
}

export async function getVariationByCategoryId(id) {
  try {
    const data = await prisma.variationValue.findMany({
      where: { categoryId: id },
      include: {
        variation: {
          select: { id: true, name: true }, // Include the related variation data
        }, // Include the related variationName data
      },
    });

    const { chart } = await getCategorySizeSettings(id);
    if (chart) {
      const chartValues = await prisma.variationValue.findMany({
        where: { variation: sizeVariationFilter, value: { in: chart.sizes } },
        include: { variation: { select: { id: true, name: true } } },
        orderBy: [{ categoryId: { sort: "asc", nulls: "first" } }, { id: "asc" }],
      });
      const seen = new Set(data.filter((item) => item.variation.name.toLowerCase() === "size").map((item) => item.value));
      for (const item of chartValues) {
        if (seen.has(item.value)) continue;
        data.push(item);
        seen.add(item.value);
      }
    }

    const grouped = Object.values(
      data.reduce((acc, item) => {
        const key = item.variation.id;
        if (!acc[key]) {
          acc[key] = {
            variation: {
              id: item.variation.id,
              name: item.variation.name,
            },
            values: [],
          };
        }
        acc[key].values.push({
          id: item.id,
          value: item.value,
        });
        return acc;
      }, {})
    );

    return { success: true, data: grouped }; // Return success with user data
  } catch (error) {
    return { success: false, error: error.message }; // Return structured error
  }
}
export async function getVariationById(id) {
  try {
    const data = await prisma.variationName.findUnique({
      where: { id },
    });
    return { success: true, data }; // Return success with user data
  } catch (error) {
    return { success: false, error: error.message }; // Return structured error
  }
}

export async function getAllVariationList(params) {
  try {
    const {
      limit = 10,
      cursor,
      tableProperties,
      sortField = "name",
      sortDirection = "asc",
      // ...other filters
      defaultSort = { field: "createdAt", direction: "desc" },
      name,
    } = params;

    const whereClause = {};

    if (name) {
      whereClause.name = { contains: name, mode: "insensitive" };
    }

    const selectFields = getDataSelectFields(tableProperties);

    const requestedLimit = Number(limit);
    const items = await prisma.variationName.findMany({
      take: requestedLimit + 1,
      where: whereClause,
      select: selectFields,
      cursor: cursor ? { id: cursor } : undefined,
      // The `skip: 1` is NECESSARY and CORRECT for Prisma's cursor implementation
      // to exclude the cursor itself and start on the next record.
      skip: cursor ? 1 : 0,
      orderBy: { [sortField]: sortDirection },
    });

    let nextCursor = null;
    // Check if we received more items than the requested page size.
    if (items.length > requestedLimit) {
      // --- THE CRITICAL FIX IS HERE ---
      // 1. Remove the extra item that we fetched only to check for a next page.
      items.pop();

      // 2. The new cursor is the ID of the LAST item in the *remaining* array.
      nextCursor = items[items.length - 1].id;
    }

    return {
      success: true,
      data: items,
      nextCursor: nextCursor,
    };
  } catch (error) {
    console.error("Failed to get category count:", error);
    return { success: false, error: error.message };
  }
}

export async function getVariationsCount(params) {
  try {
    const { name } = params;

    const whereClause = {};

    if (name) {
      whereClause.name = { contains: name, mode: "insensitive" };
    }

    const count = await prisma.variationName.count({
      where: whereClause,
    });

    return { success: true, count };
  } catch (error) {
    console.error("Failed to get category count:", error);
    return { success: false, error: error.message };
  }
}
