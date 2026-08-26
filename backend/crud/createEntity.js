"use server";

import { revalidatePath, revalidateTag } from "next/cache";

/**
 * Generic Create Entity
 *
 * @param {Object} options
 * @param {Object} options.model Prisma Model
 * @param {Object} options.data Create Data
 * @param {Array} options.unique Unique Fields
 * @param {Array} options.include Include Relations
 * @param {String} options.revalidatePath
 * @param {Array} options.revalidateTags
 */

export async function createEntity({
  model,
  data,
  unique = [],
  include = undefined,
  revalidatePaths = [],
  revalidateTags = [],
}) {
  try {
    // ---------- Unique Validation ----------
    if (unique.length > 0) {
      const OR = [];

      unique.forEach((field) => {
        if (
          data[field] !== undefined &&
          data[field] !== null &&
          data[field] !== ""
        ) {
          OR.push({
            [field]: data[field],
          });
        }
      });

      if (OR.length) {
        const exists = await model.findFirst({
          where: {
            OR,
          },
        });

        if (exists) {
          return {
            success: false,
            message: "Duplicate record found.",
          };
        }
      }
    }

    // ---------- Create ----------
    const result = await model.create({
      data,
      include,
    });

    // ---------- Cache ----------
    revalidatePaths.forEach((path) => revalidatePath(path));

    revalidateTags.forEach((tag) => revalidateTag(tag));

    return {
      success: true,
      message: "Created Successfully.",
      data: result,
    };
  } catch (error) {
    console.error(error);

    return {
      success: false,
      message: error.message,
    };
  }
}
