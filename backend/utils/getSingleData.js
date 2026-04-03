"use server";
import { getDataSelectFields } from "./getDataSelectFields";

export async function getSingleData({
  prisma,
  model,
  id,
  tableProperties,
  include = null, // optional include support
}) {
  try {
    if (!id) {
      return { success: false, error: "ID is required" };
    }

    const select = tableProperties
      ? getDataSelectFields(tableProperties)
      : undefined;

    const item = await prisma[model].findUnique({
      where: { id },
      ...(select && { select }),
      ...(include && { include }), // if you need relations
    });

    if (!item) {
      return { success: false, error: "Data not found" };
    }

    return { success: true, data: item };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
