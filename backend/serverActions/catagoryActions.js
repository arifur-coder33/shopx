"use server";

import prisma from "@/lib/prisma";
import { revalidateCatalogPages } from "@/backend/utils/revalidateStorefront";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { cache } from "react";
import { buildCategoryPath } from "../utils/buildCategoryPath";
import { generateSlug } from "../utils/generateSlug";
import { getDataSelectFields } from "../utils/getDataSelectFields";
import { categorySpecificationInput } from "../services/specificationService";
import { hasPermission } from "../utils/hasPermission";
import { getActiveCampaigns, getProductCardCampaignData } from "@/backend/services/campaignService";
import { buildStorefrontProductFilter } from "@/backend/utils/storefrontProductFilters";
import { getStorefrontVariationOptions } from "@/backend/utils/getStorefrontVariationOptions";
import { categorySizeChartInput } from "../services/sizeChartService";
import { readCategoryDeliveryBenefitFields } from "@/lib/categoryDeliveryBenefits";

export async function createCategoryAction(formData) {
  const data = Object.fromEntries(formData.entries());

  try {
    const sizeChart = data.sizeChartId !== undefined
      ? (await hasPermission("category", "create"), await categorySizeChartInput(data))
      : undefined;
    const slug = generateSlug(data?.slug || data?.name || "");
    if (!slug) throw new Error("A valid category slug is required.");
    if (data.specifications === undefined && (data.unitName !== undefined || data.exchangeTextMode !== undefined || data.returnTextMode !== undefined)) await hasPermission("category", "create");
    let specifications;
    if (data.specifications !== undefined) {
      await hasPermission("category", "create");
      specifications = await categorySpecificationInput(prisma, data.specifications);
    }

    const preparedData = {
      ...readCategoryDeliveryBenefitFields(data),
      sizeChart,
      ...(data.unitName && { unit: { connect: { name: data.unitName } } }),
      name: data?.name,
      description: data?.description,
      slug: slug,
      ...(specifications && { specifications: { create: specifications.map(({ specificationId, ...row }) => ({ ...row, specification: { connect: { id: specificationId } } })) } }),
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

    const fullPath = await buildCategoryPath(category.id);
    await prisma.category.update({
      where: { id: category.id },
      data: { fullPath },
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

    revalidatePath("/admin/categories");
    revalidatePath("/admin/size-charts");
    revalidatePath("/");
    revalidateTag("categories");
    revalidateTag("home-storefront");
    revalidateCatalogPages();
    revalidatePath("/category/[...slug]", "page");
    return { success: true, data: { ...category, fullPath } };
  } catch (error) {
    return { success: false, error: error.message, message: error.message };
  }
}

export async function getCategoryById(id) {
  try {
    const data = await prisma.category.findUnique({
      where: { id: id },
      select: {
        id: true,
        name: true,
        description: true,
        slug: true,
        sizeChartId: true,
        exchangeText: true,
        returnText: true,
        unitName: true,
        specifications: { orderBy: { sortOrder: "asc" }, include: { specification: { include: { parent: true } } } },

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
async function updateChildrenFullPath(parentId) {
  const children = await prisma.category.findMany({
    where: { parentCategoryId: parentId },
    select: { id: true },
  });

  for (const child of children) {
    const fullPath = await buildCategoryPath(child.id);
    await prisma.category.update({
      where: { id: child.id },
      data: { fullPath },
    });

    // এই child-এরও children থাকতে পারে
    await updateChildrenFullPath(child.id);
  }
}
export async function updateCategoryAction({ formData, id }) {
  const data = Object.fromEntries(formData.entries());

  try {
    if (data.specifications === undefined && (data.unitName !== undefined || data.exchangeTextMode !== undefined || data.returnTextMode !== undefined)) await hasPermission("category", "update");
    const sizeChart = data.sizeChartId !== undefined
      ? (await hasPermission("category", "update"), await categorySizeChartInput(data, id))
      : undefined;
    let specifications;
    if (data.specifications !== undefined) {
      await hasPermission("category", "update");
      specifications = await categorySpecificationInput(prisma, data.specifications, id);
    }
    if (!data?.name) {
      throw new Error("সব ফিল্ড গুলতে তথ্য দিন।");
    }
    const slug = generateSlug(data?.slug || data?.name || "");
    if (!slug) throw new Error("A valid category slug is required.");
    const checkSlug = await prisma.category.findFirst({
      where: { slug: slug, NOT: { id: id } },
    });

    if (checkSlug) {
      throw new Error(`The category Slug ${slug} Already Availabe`);
    }

    // }

    const preparedData = {
      ...readCategoryDeliveryBenefitFields(data),
      sizeChart,
      ...(data.unitName !== undefined && { unit: data.unitName ? { connect: { name: data.unitName } } : { disconnect: true } }),
      name: data?.name,
      description: data?.description,
      slug: slug,
      ...(data?.thumbnail
        ? { thumbnail: { connect: { id: data?.thumbnail } } }
        : {}), // <-- only connect if thumbnail exists

      ...(data?.banner ? { banner: { connect: { id: data?.banner } } } : {}), // <-- only connect if banner exists

      ...(data?.parentCategory
        ? { parentCategory: { connect: { id: data?.parentCategory } } }
        : data.parentCategory === "" ? { parentCategory: { disconnect: true } } : {}),
    };

    const updateData = await prisma.category.update({
      where: {
        id: id,
      },
      data: { ...preparedData, ...(specifications && { specifications: {
        deleteMany: { specificationId: { notIn: specifications.map((row) => row.specificationId) } },
        upsert: specifications.map(({ specificationId, ...row }) => ({
          where: { categoryId_specificationId: { categoryId: id, specificationId } },
          update: row,
          create: { ...row, specification: { connect: { id: specificationId } } },
        })),
      } }) },
    });

    const fullPath = await buildCategoryPath(id);
    await prisma.category.update({
      where: { id },
      data: { fullPath },
    });

    await updateChildrenFullPath(id);

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
    revalidatePath("/admin/categories");
    revalidatePath("/admin/size-charts");
    revalidatePath("/");
    revalidateTag("categories");
    revalidateTag("home-storefront");
    revalidateCatalogPages();
    revalidatePath("/category/[...slug]", "page");
    return { success: true, data: { ...updateData, fullPath } };
  } catch (error) {
    return { success: false, error: error.message, message: error.message };
  }
}

export async function deleteCategoryAction(id) {
  try {
    const checkCategory = await prisma.category.findUnique({
      where: { id },
      include: {
        subCategories: true,
        products: { select: { id: true } }, // ✅ product আছে কিনা check করো
      },
    });

    if (!checkCategory) {
      throw new Error("Category পাওয়া যায়নি।");
    }

    if (checkCategory?.subCategories?.length > 0) {
      throw new Error(
        "এই category-তে sub-category আছে। আগে সেগুলো delete করুন।",
      );
    }

    // ✅ product থাকলে delete করতে দেবো না
    if (checkCategory?.products?.length > 0) {
      throw new Error("এই category-তে product আছে। আগে product গুলো সরান।");
    }

    // 1. VariationValue delete করো
    await prisma.variationValue.deleteMany({
      where: { categoryId: id },
    });

    // 2. Category delete করো
    await prisma.category.delete({
      where: { id },
    });

    revalidatePath("/admin/category");
    revalidatePath("/admin/size-charts");
    revalidatePath("/");
    revalidateTag("categories");
    revalidateTag("home-storefront");
    revalidateCatalogPages();
    return { success: true, data: "সফলভাবে delete হয়েছে।" };
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

// export async function getAllCategoryWithproduct() {
//   try {
//     const data = await prisma.category.findMany({
//       include: {
//         _count: {
//           select: { products: true },
//         },
//         products: {
//           where: {
//             isActive: true,
//           },
//           orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
//           take: 10,
//           select: {
//             id: true,
//             title: true,
//             slug: true,
//             mainImage: true,
//             hasVariations: true,
//             variations: {
//               select: {
//                 regularPrice: true,
//                 discountPrice: true,
//                 combinations: true,
//               },
//             },
//             thumbnail: {
//               select: {
//                 id: true,
//                 name: true,
//               },
//             },
//             gallery: {
//               select: {
//                 media: {
//                   select: {
//                     id: true,
//                     name: true,
//                   },
//                 },
//               },
//             },
//           },
//         },
//       },
//     });
//     // Filter categories that have at least one product
//     // let regularPrice = 0;
//     // let discountPrice = 0;

//     // if (
//     //   hasVariations &&
//     //   Array.isArray(variations[0].combinations) &&
//     //   variations[0]?.combinations?.length > 0
//     // ) {
//     //   regularPriceValue = Math.min(
//     //     ...data?.products.variations.map((v) => v.regularPrice),
//     //   );
//     //   discountPriceValue = Math.min(
//     //     ...data?.products.variations.map(
//     //       (v) => v.discountPrice ?? v.regularPrice,
//     //     ),
//     //   );
//     // } else {
//     //   regularPriceValue =
//     //     variations?.length === 1 ? variations[0]?.regularPrice : 0;
//     //   discountPriceValue =
//     //     variations?.length === 1 ? variations[0]?.discountPrice : 0;
//     // }

//     // If discount is not actually lower, don't show it
//     // if (discountPriceValue >= regularPriceValue) {
//     //   discountPriceValue = 0;
//     // }
//     const filteredData = data
//       .filter((category) => category._count.products > 0)
//       .map((category) => ({
//         ...category,
//         products: category.products.map((product) => ({
//           hasVariations: product.isVariations,
//           title: product.title,
//           slug: product.slug,
//           id: product.id,
//           regularPrice: Math.min(product.variations.map((v) => v.regularPrice)),
//           discountPrice: Math.min(
//             product.variations.map((v) => v.regularPrice),
//           ),
//           thumbnail: product.thumbnail.name,
//           gallery: product.gallery.map((g) => g.media), // Extract only media
//         })),
//       }));
//     console.log(filteredData);
//     return { success: true, data: filteredData };
//   } catch (error) {
//     return { success: false, error: error.message };
//   }
// }

export async function getAllCategoryWithproduct() {
  try {
    const [data, campaigns] = await Promise.all([
      prisma.category.findMany({
      where: {
        products: { some: { isActive: true } },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        products: {
          where: { isActive: true },
          orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
          take: 10,
          select: {
            id: true,
            categoryId: true,
            title: true,
            slug: true,
            productCode: true,
            hasVariations: true,
            variations: {
              select: {
                sku: true,
                regularPrice: true,
                discountPrice: true,
              },
            },
            thumbnail: {
              select: { name: true },
            },
            category: { select: { name: true, slug: true } },
          },
        },
      },
    }),
      getActiveCampaigns(),
    ]);

    const categoryProductIds = data.flatMap((category) => category.products.map((product) => product.id));
    const reviewRows = categoryProductIds.length
      ? await prisma.photoReview.groupBy({
          by: ["productId"],
          where: { productId: { in: categoryProductIds }, isPublished: true },
          _count: { _all: true },
          _avg: { rating: true },
        })
      : [];
    const reviewsByProductId = new Map(reviewRows.map((row) => [row.productId, {
      reviewCount: row._count._all,
      reviewRating: row._avg.rating || 0,
    }]));

    const filteredData = data
      .map((category) => ({
        ...category,
        products: category.products.map((product) => {
          const variations = product.variations || [];

          if (variations.length === 0) {
            return {
              id: product.id,
              title: product.title,
              slug: product.slug,
              regularPrice: 0,
              discountPrice: 0,
              hasVariations: false,
              ...(reviewsByProductId.get(product.id) || { reviewCount: 0, reviewRating: 0 }),
              thumbnail: product.thumbnail?.name || null,
              category: product.category.name,
              ...getProductCardCampaignData({ campaigns, productId: product.id, categoryId: product.categoryId, regularPrice: 0, discountPrice: 0 }),
            };
          }

          const regularPrices = variations.map((v) => v.regularPrice);
          const discountPrices = variations.map(
            (v) => v.discountPrice ?? v.regularPrice,
          );

          const minRegular = Math.min(...regularPrices);
          let minDiscount = Math.min(...discountPrices);

          // discount validate
          if (minDiscount >= minRegular) {
            minDiscount = 0;
          }

          return {
            id: product.id,
            title: product.title,
            slug: product.slug,
            regularPrice: minRegular,
            discountPrice: minDiscount,
            hasVariations: product.hasVariations,
            ...(reviewsByProductId.get(product.id) || { reviewCount: 0, reviewRating: 0 }),
            thumbnail: { name: product.thumbnail?.name || null },
            category: product.category.name,
            ...getProductCardCampaignData({ campaigns, productId: product.id, categoryId: product.categoryId, regularPrice: minRegular, discountPrice: minDiscount }),
            // gallery: product.gallery.map((g) => g.media),
          };
        }),
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

const queryNavigationCategories = () =>
  prisma.category.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      parentCategoryId: true,
    },
  });

const queryNavigationCategoriesWithRetry = async () => {
  try {
    return await queryNavigationCategories();
  } catch (error) {
    const isConnectionError =
      error?.code === "P1001" || /Can't reach database server/i.test(error?.message || "");
    if (!isConnectionError) throw error;

    await new Promise((resolve) => setTimeout(resolve, 500));
    return queryNavigationCategories();
  }
};

const getNavigationCategories = cache(queryNavigationCategoriesWithRetry);
const getCachedNavigationCategories = unstable_cache(
  queryNavigationCategoriesWithRetry,
  ["navigation-categories-v1"],
  { revalidate: false, tags: ["categories"] },
);

export async function getCategoryTree() {
  let allCategories;

  try {
    // Share this tree across public requests while keeping development reads fresh.
    allCategories = await (process.env.NODE_ENV === "development"
      ? getNavigationCategories()
      : getCachedNavigationCategories());
  } catch (error) {
    // A production regeneration must fail instead of indefinitely caching an
    // empty menu after a temporary outage. Development can keep a fallback.
    if (process.env.NODE_ENV === "development") {
      console.error("Category navigation is unavailable:", error.message);
    } else {
      throw error;
    }
    return [];
  }

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
const CATEGORY_PRODUCT_PAGE_SIZE = 24;

export async function getCategoryPageData(slug, cursor = null, rawFilters = {}) {
  try {
    // 1️⃣ all categories (for tree + recursion)
    const categories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        slug: true,
        fullPath: true,
        parentCategoryId: true,
      },
    });

    // 2️⃣ find last category (e.g. shirt)
    const targetCategory = categories.find((c) => c.slug === slug);

    if (!targetCategory) {
      return { success: false, notFound: true, error: "Category not found" };
    }

    const categoryById = new Map(categories.map((category) => [category.id, category]));
    const categoryHierarchy = [];
    const visited = new Set();
    let currentCategory = targetCategory;
    while (currentCategory && !visited.has(currentCategory.id)) {
      visited.add(currentCategory.id);
      categoryHierarchy.unshift(currentCategory);
      currentCategory = currentCategory.parentCategoryId
        ? categoryById.get(currentCategory.parentCategoryId)
        : null;
    }
    const breadcrumbs = categoryHierarchy.map((category, index) => ({
      label: category.name,
      href:
        index === categoryHierarchy.length - 1
          ? undefined
          : `/category/${
              category.fullPath ||
              categoryHierarchy
                .slice(0, index + 1)
                .map((item) => item.slug)
                .join("/")
            }`,
    }));

    // Build the category subtree in linear time instead of filtering all
    // categories repeatedly for each descendant.
    const childrenByParent = new Map();
    for (const category of categories) {
      if (!category.parentCategoryId) continue;
      const children = childrenByParent.get(category.parentCategoryId) || [];
      children.push(category.id);
      childrenByParent.set(category.parentCategoryId, children);
    }
    const categoryIds = [];
    const pendingCategoryIds = [targetCategory.id];
    const visitedCategoryIds = new Set();
    while (pendingCategoryIds.length) {
      const categoryId = pendingCategoryIds.pop();
      if (visitedCategoryIds.has(categoryId)) continue;
      visitedCategoryIds.add(categoryId);
      categoryIds.push(categoryId);
      pendingCategoryIds.push(...(childrenByParent.get(categoryId) || []));
    }

    const { productWhere, variationWhere } = buildStorefrontProductFilter(rawFilters);

    // 4️⃣ get products (ONLY LIGHT DATA)
    const [products, campaigns] = await Promise.all([prisma.product.findMany({
      where: {
        isActive: true,
        categoryId: {
          in: categoryIds,
        },
        ...productWhere,
      },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      take: CATEGORY_PRODUCT_PAGE_SIZE + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      select: {
        id: true,
        categoryId: true,
        title: true,
        slug: true,
        hasVariations: true,
        variations: {
          ...(variationWhere && { where: variationWhere }),
          select: {
            regularPrice: true,
            discountPrice: true,
          },
        },
        thumbnail: {
          select: {
            id: true,
            name: true,
          },
        },
        category: { select: { name: true, slug: true } },
      },
    }), getActiveCampaigns()]);

    const hasMore = products.length > CATEGORY_PRODUCT_PAGE_SIZE;
    const visibleProducts = hasMore
      ? products.slice(0, CATEGORY_PRODUCT_PAGE_SIZE)
      : products;
    const reviewRows = visibleProducts.length
      ? await prisma.photoReview.groupBy({
          by: ["productId"],
          where: { productId: { in: visibleProducts.map((product) => product.id) }, isPublished: true },
          _count: { _all: true },
          _avg: { rating: true },
        })
      : [];
    const reviewsByProductId = new Map(reviewRows.map((row) => [row.productId, { reviewCount: row._count._all, reviewRating: row._avg.rating || 0 }]));
    const filteredProducts = visibleProducts.map((product) => {
      const variations = product.variations || [];

      if (variations.length === 0) {
        return {
          id: product.id,
          title: product.title,
          slug: product.slug,
          regularPrice: 0,
          discountPrice: 0,
          hasVariations: false,
          ...(reviewsByProductId.get(product.id) || { reviewCount: 0, reviewRating: 0 }),
          thumbnail: product.thumbnail?.name || null,
          ...getProductCardCampaignData({ campaigns, productId: product.id, categoryId: product.categoryId, regularPrice: 0, discountPrice: 0 }),
        };
      }

      const regularPrices = variations.map((v) => v.regularPrice);
      const discountPrices = variations.map(
        (v) => v.discountPrice ?? v.regularPrice,
      );

      const minRegular = Math.min(...regularPrices);
      let minDiscount = Math.min(...discountPrices);

      // discount validate
      if (minDiscount >= minRegular) {
        minDiscount = 0;
      }

      return {
        id: product.id,
        title: product.title,
        slug: product.slug,
        regularPrice: minRegular,
        discountPrice: minDiscount,
        hasVariations: product.hasVariations,
        ...(reviewsByProductId.get(product.id) || { reviewCount: 0, reviewRating: 0 }),
        thumbnail: { name: product.thumbnail?.name || null },
        ...getProductCardCampaignData({ campaigns, productId: product.id, categoryId: product.categoryId, regularPrice: minRegular, discountPrice: minDiscount }),
        // gallery: product.gallery.map((g) => g.media),
      };
    });

    return {
      success: true,
      data: filteredProducts,
      ...(cursor ? {} : { variationOptions: await getStorefrontVariationOptions(categoryIds) }),
      nextCursor: hasMore ? visibleProducts.at(-1)?.id || null : null,
      category: {
        id: targetCategory.id,
        name: targetCategory.name,
        description: targetCategory.description,
        slug: targetCategory.slug,
        fullPath: targetCategory.fullPath,
      },
      breadcrumbs,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}
