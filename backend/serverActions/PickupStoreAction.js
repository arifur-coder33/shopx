"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createPickupStoreAction(formData) {
  const data = Object.fromEntries(formData.entries());

  try {
    const preparedData = {
      name: data?.name,
      description: data?.description,
      slug: slug,
      ...(data?.thumbnail
        ? { thumbnail: { connect: { id: data?.thumbnail } } }
        : {}), // <-- only connect if thumbnail exists

      ...(data?.banner ? { banner: { connect: { id: data?.banner } } } : {}), // <-- only connect if banner exists

      ...(data?.parentCategory
        ? { parentCategory: { connect: { id: data?.parentCategory } } }
        : {}), // <-- only connect if parentCategory exists
    };
    if (!data?.name) {
      throw new Error("সব ফিল্ড গুলতে তথ্য দিন।");
    }
    const checkSlug = await prisma.category.findUnique({
      where: { slug: slug },
    });

    if (checkSlug) {
      throw new Error("This category Already Availabe ");
    }

    // }

    const category = await prisma.category.create({
      data: preparedData,
    });

    if (data?.variations) {
      const parseVariation = JSON.parse(data?.variations);

      for (const variationItem of parseVariation) {
        const variationId = variationItem?.variation?.id;
        const value = variationItem?.value.trim();

        await prisma.VariationValue.create({
          data: {
            variation: { connect: { id: variationId } },
            category: { connect: { id: category.id } },
            value: value,
          },
        });
      }
    }

    revalidatePath("/admin/category");
    return { success: true, data: category }; // Return success with user data
  } catch (error) {
    return { success: false, error: error }; // Return structured error
  }
}

export async function getCategoryById(id) {
  try {
    const data = await prisma.category.findUnique({
      where: { id: id },
      select: {
        id: true,
        name: true,
        slug: true,

        thumbnail: {
          select: {
            id: true,
            name: true,
          },
        },
        banner: {
          select: {
            id: true,
            name: true,
          },
        },
        parentCategory: {
          select: {
            id: true,
            name: true,
          },
        },
        variations: {
          include: {
            variation: true,
          },
        },
      },
    });
    console.log("getCategoryById data:", data);
    return { success: true, data };
  } catch (error) {
    console.log(error);
    return { success: false, error: error.message }; // Return structured error
  }
}
export async function updateCategoryAction({ formData, id }) {
  const data = Object.fromEntries(formData.entries());

  try {
    if (!data?.name) {
      throw new Error("সব ফিল্ড গুলতে তথ্য দিন।");
    }
    const slug = await newSlug(data?.slug || data?.name);
    const checkSlug = await prisma.category.findFirst({
      where: { slug: slug, NOT: { id: id } },
    });

    if (checkSlug) {
      throw new Error(`The category Slug ${slug} Already Availabe`);
    }

    // }

    const preparedData = {
      name: data?.name,
      description: data?.description,
      slug: slug,
      ...(data?.thumbnail
        ? { thumbnail: { connect: { id: data?.thumbnail } } }
        : {}), // <-- only connect if thumbnail exists

      ...(data?.banner ? { banner: { connect: { id: data?.banner } } } : {}), // <-- only connect if banner exists

      ...(data?.parentCategory
        ? { parentCategory: { connect: { id: data?.parentCategory } } }
        : {}), // <-- only connect if parentCategory exists
    };

    const updateData = await prisma.category.update({
      where: {
        id: id,
      },
      data: preparedData,
    });

    // existing variationValue
    const existingVariationValue = await prisma.variationValue.findMany({
      where: {
        categoryId: id,
      },
    });
    if (data?.variations) {
      const parseVariations = JSON.parse(data?.variations);

      if (parseVariations?.length === 0 && existingVariationValue?.length > 0) {
        /// delete all category if incoming length 0
        await prisma.variationValue.deleteMany({
          where: {
            categoryId: id,
          },
        });
      } else {
        const incomingVariationIds = parseVariations
          .map((v) => v.id)
          .filter(Boolean);
        const incomingVariationNewItems = parseVariations.filter((v) => !v.id);
        const existingIds = existingVariationValue.map((v) => v.id);
        const idsTodelete = existingIds.filter(
          (existingId) => !incomingVariationIds.includes(existingId)
        );

        if (idsTodelete?.length > 0) {
          await prisma?.variationValue.deleteMany({
            where: {
              id: { in: idsTodelete },
            },
          });
        }

        for (const variation of parseVariations) {
          if (variation?.id) {
            await prisma.variationValue.update({
              where: { id: variation?.id },
              data: {
                value: variation?.value.trim(),
                variation: { connect: { id: variation?.variation?.id } },
                category: { connect: { id: id } },
              },
            });
          }
        }

        for (const variationItem of incomingVariationNewItems) {
          console.log(variationItem);
          const variationId = variationItem?.variation?.id;
          const value = variationItem?.value.trim();
          await prisma?.variationValue?.create({
            data: {
              value: value,
              variation: { connect: { id: variationId } },
              category: { connect: { id: id } },
            },
          });
        }
      }
    } else {
      if (existingVariationValue?.length > 0) {
        await prisma?.variationValue.deleteMany({
          where: {
            categoryId: id,
          },
        });
      }
    }
    revalidatePath("/admin/product/add");
    return { success: true, data: updateData }; // Return success with user data
  } catch (error) {
    console.log(error);
    return { success: false, error: error.message }; // Return structured error
  }
}

export async function deleteCategoryAction(id) {
  try {
    const checkChildCategory = await prisma.category.findUnique({
      where: { id: id },
      include: {
        subCategories: true,
      },
    });
    if (checkChildCategory?.subCategories?.length > 0) {
      throw new Error(
        "This category has Sub categories. Please delete them first."
      );
    }
    // 1. First delete all VariationValue where categoryId = id
    await prisma.variationValue.deleteMany({
      where: { categoryId: id },
    });

    // 2. Then delete the Category
    const deletedCategory = await prisma.category.delete({
      where: { id },
    });

    revalidatePath("/admin/category");

    return { success: true, data: "Sucessfully deleted" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getCategory() {
  console.log(" category backend call");
  try {
    const data = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true,
        thumbnail: {
          select: {
            id: true,
            name: true,
          },
        },
        banner: {
          select: {
            id: true,
            name: true,
          },
        },
        // variations: {
        //   include: {
        //     variation: true,
        //   },
        // },
      },
    });
    console.log(data);
    return { success: true, data }; // Return success with user data
  } catch (error) {
    console.log(error);
    return { success: false, error: error.message }; // Return structured error
  }
}
