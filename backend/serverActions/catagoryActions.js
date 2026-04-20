"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { newSlug } from "../utils/generateSlug";
import { getDataSelectFields } from "../utils/getDataSelectFields";

export async function createCategoryAction(formData) {
  const data = Object.fromEntries(formData.entries());

  try {
    const slug = await newSlug(data?.slug || data?.name);

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
          (existingId) => !incomingVariationIds.includes(existingId),
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
        "This category has Sub categories. Please delete them first.",
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
  try {
    const data = await prisma.category.findMany({
      select: {
        parentCategoryId: true,
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

    return { success: true, data }; // Return success with user data
  } catch (error) {
    console.log(error);
    return { success: false, error: error.message }; // Return structured error
  }
}

export async function getAllCategoryWithproduct() {
  try {
    const data = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
        products: {
          where: {
            isActive: true,
          },
          orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
          take: 10,
          select: {
            id: true,
            title: true,
            slug: true,
            mainImage: true,
            hasVariations: true,
            variations: {
              select: {
                regularPrice: true,
                discountPrice: true,
                combinations: true,
              },
            },
            thumbnail: {
              select: {
                id: true,
                name: true,
              },
            },
            gallery: {
              select: {
                media: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Filter categories that have at least one product
    const filteredData = data
      .filter((category) => category._count.products > 0)
      .map((category) => ({
        ...category,
        products: category.products.map((product) => ({
          ...product,
          gallery: product.gallery.map((g) => g.media), // Extract only media
        })),
      }));

    return { success: true, data: filteredData };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// export async function getCategoryWithproduct(slug) {
//   const decodedSlug = decodeURIComponent(slug);
//   console.log("Decoded slug:", decodedSlug);
//   try {
//     const data = await prisma.category.findUnique({
//       where: {
//         slug: decodedSlug,
//       },
//       include: {
//         _count: {
//           select: { products: true },
//         },
//         products: {
//           select: {
//             id: true,
//             title: true,
//             regularPrice: true,
//             discountPrice: true,
//             slug: true,
//             mainImage: true,
//           },
//         },
//       },
//     });
//     console.log("Category with products:", data);
//     return { success: true, data };
//   } catch (error) {
//     return { success: false, error: error.message };
//   }
// }

export async function getAllCategoriesList(params) {
  try {
    const {
      limit = 10,
      cursor,
      tableProperties,
      sortField = "createdAt",
      sortDirection = "desc",
      // ...other filters
      name,
    } = params;

    const whereClause = {};

    if (name) {
      whereClause.name = { contains: name, mode: "insensitive" };
    }

    const selectFields = getDataSelectFields(tableProperties);

    const requestedLimit = Number(limit);
    const items = await prisma.category.findMany({
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

export async function getcategoryCount(params) {
  try {
    const { name } = params;

    const whereClause = {};

    if (name) {
      whereClause.name = { contains: name, mode: "insensitive" };
    }

    const count = await prisma.category.count({
      where: whereClause,
    });

    return { success: true, count };
  } catch (error) {
    console.error("Failed to get category count:", error);
    return { success: false, error: error.message };
  }
}

// export async function getCategoryTree() {
//   const allCategories = await prisma.category.findMany({
//     include: { parentCategory: true },
//   });

//   // Helper to build tree recursively
//   function buildTree(parentCategoryId = null) {
//     return allCategories
//       .filter((cat) => cat.parentCategoryId === parentCategoryId)
//       .map((cat) => ({
//         ...cat,
//         subCategories: buildTree(cat.id),
//       }));
//   }

//   return buildTree(null); // start from root categories
// }

export async function getCategoryTree() {
  const allCategories = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      parentCategoryId: true,
    },
  });

  const map = new Map();
  const roots = [];

  allCategories.forEach((cat) => {
    map.set(cat.id, { ...cat, subCategories: [] });
  });

  allCategories.forEach((cat) => {
    if (cat.parentCategoryId) {
      map.get(cat.parentCategoryId)?.subCategories.push(map.get(cat.id));
    } else {
      roots.push(map.get(cat.id));
    }
  });

  return roots;
}
export async function getCategoryPageData(slug) {
  const decodedSlug = decodeURIComponent(slug);
  const slugs = decodedSlug.split("/");

  try {
    // 1️⃣ all categories (for tree + recursion)
    const categories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        parentCategoryId: true,
      },
    });

    // 2️⃣ find last category (e.g. shirt)
    const targetCategory = categories.find((c) => c.slug === slug);

    if (!slugs) {
      return { success: false, error: "Category not found" };
    }

    // 3️⃣ recursive function for subcategories
    const getChildIds = (parentCategoryId) => {
      const children = categories.filter(
        (c) => c.parentCategoryId === parentCategoryId,
      );

      let ids = [parentCategoryId];

      children.forEach((child) => {
        ids = [...ids, ...getChildIds(child.id)];
      });

      return ids;
    };

    const categoryIds = getChildIds(targetCategory.id);

    // 4️⃣ get products (ONLY LIGHT DATA)
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        categoryId: {
          in: categoryIds,
        },
      },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        slug: true,
        mainImage: true,
        hasVariations: true,
        variations: {
          select: {
            regularPrice: true,
            discountPrice: true,
            combinations: true,
          },
        },
        thumbnail: {
          select: {
            id: true,
            name: true,
          },
        },
        gallery: {
          select: {
            media: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // const filteredData = products.map((category) => ({
    //   ...category,
    //   products: category.products.map((product) => ({
    //     ...product,
    //     gallery: product.gallery.map((g) => g.media), // Extract only media
    //   })),
    // }));

    return { success: true, data: products };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}
