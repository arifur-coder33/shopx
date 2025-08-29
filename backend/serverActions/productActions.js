"use server";

import prisma from "@/lib/prisma";
import { getMinMax } from "@/utils/getMinMax";
import { revalidatePath, revalidateTag } from "next/cache";
import { generateSlug, generateUniqueSlug } from "../utils/generateSlug";

function transformVariations(productVariations) {
  if (!productVariations || productVariations.length === 0) {
    return [];
  }

  // Map over each ProductVariation record. Each record is a unique variant.
  return productVariations.map((pv) => {
    // Build the `combination` array by mapping over the nested `combinations`
    const combination = pv.combinations.map((combo) => ({
      variation: {
        id: combo.variationName.id,
        name: combo.variationName.name,
      },
      value: {
        id: combo.variationValue.id,
        value: combo.variationValue.value,
      },
    }));

    const combinations = pv.combinations.map((combo) => ({
      variationName: {
        id: combo.variationName.id,
        name: combo.variationName.name,
      },
      variationValue: {
        id: combo.variationValue.id,
        value: combo.variationValue.value,
      },
    }));

    // Build the `variationValues` object for easy lookup (e.g., { Color: 'Red', Size: 'Large' })
    const variationValues = pv.combinations.reduce((acc, combo) => {
      acc[combo.variationName.name] = combo.variationValue.value;
      return acc;
    }, {});

    return {
      id: pv.id, // The ID of the ProductVariation record itself
      matcherId: pv.matcherId,
      sku: pv.sku || "",
      regularPrice: pv.regularPrice !== null ? String(pv.regularPrice) : "",
      discountPrice: pv.discountPrice !== null ? String(pv.discountPrice) : "",
      stock: pv.stock !== null ? String(pv.stock) : "",
      qty: pv.stock !== null ? String(pv.stock) : "",
      image: pv.thumbnail
        ? { id: pv.thumbnail.id, name: pv.thumbnail.name }
        : null,
      imageUrl: pv.thumbnail?.name ? `/uploads/${pv.thumbnail.name}` : null,
      combination: combination,
      combinations: combinations,
      variationValues: variationValues,
    };
  });
}

export async function createProductActions(formData) {
  try {
    let data = Object.fromEntries(formData.entries());

    // --- Basic Validation ---
    if (!data?.title || !data?.regularPrice || !data?.thumbnail) {
      throw new Error(
        "সব ফিল্ড গুলতে তথ্য দিন। (Title, Regular Price, Thumbnail are required)"
      );
    }
    if (
      isNaN(parseFloat(data.regularPrice)) ||
      parseFloat(data.regularPrice) < 0
    ) {
      throw new Error("Regular price must be a valid number.");
    }

    // --- Parse Product Variations ---
    let parsedProductVariations = [];
    if (data.variations && typeof data.variations === "string") {
      try {
        parsedProductVariations = JSON.parse(data.variations);
        if (!Array.isArray(parsedProductVariations)) {
          throw new Error("Variations data must be an array.");
        }
      } catch (e) {
        console.error("Error parsing product variations JSON:", e);
        throw new Error(
          "ভুল ভ্যারিয়েশন তথ্য ফরম্যাট। (Invalid variation data format.)"
        );
      }
    } else if (Array.isArray(data.variations)) {
      parsedProductVariations = data.variations;
    }

    // --- Prisma Transaction ---
    const result = await prisma.$transaction(async (tx) => {
      // --- Slug Generation ---
      const baseSlug = await generateSlug(data?.slug || data?.title);
      const slug = await generateUniqueSlug(tx, baseSlug);

      // --- Product Code Generation ---
      let productCodeCounter = await tx.productCodeCounter.findFirst();
      if (!productCodeCounter) {
        productCodeCounter = await tx.ProductCodeCounter.create({
          data: { lastProductCode: 1000 },
        });
      }
      const newProductCode = (
        productCodeCounter.lastProductCode + 1
      ).toString();
      await tx.ProductCodeCounter.update({
        where: { id: productCodeCounter.id },
        data: { lastProductCode: productCodeCounter.lastProductCode + 1 },
      });

      // --- Prepare Gallery Media IDs ---
      const mediaIds = data?.gallery
        ? data.gallery
            .split(",")
            .map((id) => id.trim())
            .filter((id) => id)
        : [];

      // --- Filter out variation data from main product data ---
      const { gallery, variations, ...filteredData } = data;

      // --- Robust Number Parsing Helper ---
      const parseOptionalNumber = (value, defaultValue = null) => {
        if (
          value === undefined ||
          value === null ||
          String(value).trim() === ""
        ) {
          return defaultValue;
        }
        const num = Number(value);
        return isNaN(num) ? defaultValue : num;
      };

      // --- Prepare Main Product Data ---
      const mainProductRegularPrice = Number(data.regularPrice);

      const preparedData = {
        ...filteredData,
        productCode: newProductCode,
        isActive: Boolean(data?.isActive === "on" || data?.isActive === true),
        isFeatured: Boolean(
          data?.isFeatured === "on" || data?.isFeatured === true
        ),
        slug: slug,
        category: data?.category
          ? { connect: { id: data.category } }
          : undefined,
        thumbnail: { connect: { id: data.thumbnail } },
        regularPrice: mainProductRegularPrice,
        discountPrice: parseOptionalNumber(data.discountPrice),
        stock:
          parsedProductVariations.length > 0
            ? 0
            : parseOptionalNumber(data.stock, 0),
        insideDhaka: parseOptionalNumber(data.insideDhaka),
        outSideDhaka: parseOptionalNumber(data.outSideDhaka),
        weight: parseOptionalNumber(data.weight),
        hasVariations: parsedProductVariations.length > 0,
        description: data?.description || null,
        seoKeyWord: data?.seoKeyWord || null,
        seoDescription: data?.seoDescription || null,
      };

      // 🔹 Create the product
      const product = await tx.product.create({
        data: preparedData,
      });

      // 🔹 Insert product gallery separately
      if (mediaIds.length > 0) {
        await tx.productGallery.createMany({
          data: mediaIds.map((mediaId) => ({
            productId: product.id,
            mediaId: mediaId,
          })),
        });
      }

      // 🔹 [NEW LOGIC] Create Product Variations and their Combinations
      if (parsedProductVariations.length > 0) {
        for (const variantData of parsedProductVariations) {
          // Validate incoming variant data structure
          if (
            !variantData.matcherId ||
            !Array.isArray(variantData.combination) ||
            variantData.combination.length === 0
          ) {
            console.warn(
              "Skipping incomplete variant data (missing matcherId or combination array):",
              variantData
            );
            continue; // Skip this variant and move to the next
          }

          // Prepare data for the single ProductVariation record
          const variantSku =
            variantData.sku ||
            `${product.productCode}-${variantData.matcherId}`;
          const variantStock = parseOptionalNumber(variantData.qty, 0);
          const variantRegularPrice = parseOptionalNumber(
            variantData.regularPrice,
            product.regularPrice
          );

          const variantDiscountPrice = parseOptionalNumber(
            variantData.discountPrice,
            product.discountPrice || product.regularPrice
          );
          const variantWeight = parseOptionalNumber(
            variantData.weight,
            product.weight
          );
          // The `transformVariations` function puts image info in `image: {id, name}`
          const variantThumbnailId = variantData.image || product.thumbnailId;

          // Prepare the array of `Combination` data for the nested create
          const combinationsToCreate = variantData.combination
            .map((combo) => {
              if (!combo.variation?.id || !combo.value?.id) {
                console.warn(
                  "Skipping combination with missing variation or value ID:",
                  combo
                );
                return null; // This will be filtered out
              }
              return {
                variationNameId: combo.variation.id,
                variationValueId: combo.value.id,
              };
            })
            .filter(Boolean); // Remove any null entries from invalid combinations

          // Ensure we still have valid combinations to create
          if (combinationsToCreate.length === 0) {
            console.warn(
              "Skipping variant as it has no valid combinations after filtering:",
              variantData
            );
            continue;
          }

          // Create the ProductVariation and its related Combinations in one go
          await tx.productVariation.create({
            data: {
              product: { connect: { id: product.id } }, // Link to the parent product
              matcherId: variantData.matcherId,
              sku: variantSku,
              stock: variantStock,
              regularPrice: variantRegularPrice,
              discountPrice: variantDiscountPrice,
              weight: variantWeight,
              thumbnail: variantThumbnailId
                ? { connect: { id: variantThumbnailId } }
                : undefined,
              // Nested create for the Combination records
              combinations: {
                create: combinationsToCreate,
              },
            },
          });
        }
      }

      return product; // Return the created product from the transaction
    });

    // --- Revalidation ---
    revalidatePath("/admin/product");
    revalidatePath("/");
    revalidatePath(`/product/${result.slug}`);
    revalidateTag("products");
    revalidateTag(`product-${result.slug}`);
    console.log("Product created with variations:", result);
    return { success: true, data: result };
  } catch (error) {
    console.log("Error creating product:", error);

    return {
      success: false,
      message: error.message || "প্রোডাক্ট তৈরি করতে একটি ত্রুটি ঘটেছে।",
    };
  }
}

export async function createProductAction(formData) {
  try {
    let data = Object.fromEntries(formData.entries());

    // --- Basic Validation ---
    if (!data?.title || !data?.thumbnail) {
      throw new Error(
        "সব ফিল্ড গুলতে তথ্য দিন। (Title, Regular Price, Thumbnail are required)"
      );
    }

    // --- Parse Product Variations ---
    let parsedProductVariations = [];
    if (data.variations && typeof data.variations === "string") {
      try {
        parsedProductVariations = JSON.parse(data.variations);
        if (!Array.isArray(parsedProductVariations)) {
          throw new Error("Variations data must be an array.");
        }
      } catch (e) {
        throw new Error(
          "ভুল ভ্যারিয়েশন তথ্য ফরম্যাট। (Invalid variation data format.)"
        );
      }
    } else if (Array.isArray(data.variations)) {
      parsedProductVariations = data.variations;
    }

    // --- Prisma Transaction ---
    const result = await prisma.$transaction(async (tx) => {
      // --- Slug Generation ---
      const baseSlug = await generateSlug(data?.slug || data?.title);
      const slug = await generateUniqueSlug(tx, baseSlug);

      // --- Product Code Generation ---
      let productCodeCounter = await tx.productCodeCounter.findFirst();
      if (!productCodeCounter) {
        productCodeCounter = await tx.ProductCodeCounter.create({
          data: { lastProductCode: 1000 },
        });
      }
      const newProductCode = (
        productCodeCounter.lastProductCode + 1
      ).toString();
      await tx.ProductCodeCounter.update({
        where: { id: productCodeCounter.id },
        data: { lastProductCode: productCodeCounter.lastProductCode + 1 },
      });

      // --- Prepare Gallery Media IDs ---
      const mediaIds = data?.gallery
        ? data.gallery
            .split(",")
            .map((id) => id.trim())
            .filter((id) => id)
        : [];

      // --- Filter out data not belonging to the main Product model ---
      const {
        gallery,
        variations,
        regularPrice,
        discountPrice,
        stock,
        ...filteredData
      } = data;

      // --- Robust Number Parsing Helper ---
      const parseOptionalNumber = (value, defaultValue = null) => {
        if (
          value === undefined ||
          value === null ||
          String(value).trim() === ""
        ) {
          return defaultValue;
        }
        const num = Number(value);
        return isNaN(num) ? defaultValue : num;
      };

      // --- Prepare Main Product Data [MODIFIED] ---
      // Price, stock are now removed from the main product create call
      const preparedData = {
        ...filteredData,
        productCode: newProductCode,
        isActive: Boolean(data?.isActive === "on" || data?.isActive === true),
        isFeatured: Boolean(
          data?.isFeatured === "on" || data?.isFeatured === true
        ),
        slug: slug,
        category: data?.category
          ? { connect: { id: data.category } }
          : undefined,
        thumbnail: { connect: { id: data.thumbnail } },
        weight: parseOptionalNumber(data.weight), // Base weight
        dimensions: data.dimensions || null, // Optional dimensions
        // This flag is key for your UI to know whether to show variation options
        hasVariations: parsedProductVariations.length > 0,
        description: data?.description || null,
        seoKeyWord: data?.seoKeyWord || null,
        seoDescription: data?.seoDescription || null,
      };

      // 🔹 Create the product
      const product = await tx.product.create({
        data: preparedData,
      });

      // 🔹 Insert product gallery separately
      if (mediaIds.length > 0) {
        await tx.productGallery.createMany({
          data: mediaIds.map((mediaId) => ({
            productId: product.id,
            mediaId: mediaId,
          })),
        });
      }

      // --- [NEW UNIFIED LOGIC] ---
      // Always create at least one ProductVariation.
      // If there are user-defined variations, create them.
      // Otherwise, create a single default variation for the simple product.

      if (parsedProductVariations.length > 0) {
        // --- LOGIC FOR PRODUCTS WITH USER-DEFINED VARIATIONS ---
        const mainProductRegularPrice = Number(data.regularPrice);

        for (const variantData of parsedProductVariations) {
          if (
            !variantData.matcherId ||
            !Array.isArray(variantData.combination)
          ) {
            continue;
          }

          const combinationsToCreate = variantData.combination
            .map((combo) => {
              if (!combo.variation?.id || !combo.value?.id) return null;
              return {
                variationNameId: combo.variation.id,
                variationValueId: combo.value.id,
              };
            })
            .filter(Boolean);

          if (combinationsToCreate.length === 0) continue;

          await tx.productVariation.create({
            data: {
              product: { connect: { id: product.id } },
              matcherId: variantData.matcherId,
              sku:
                variantData.sku ||
                `${product.productCode}-${variantData.matcherId}`,
              stock: parseOptionalNumber(variantData.qty, 0),
              regularPrice: parseOptionalNumber(
                variantData.regularPrice,
                mainProductRegularPrice
              ),
              discountPrice: parseOptionalNumber(
                variantData.discountPrice,
                parseOptionalNumber(data.discountPrice)
              ),

              thumbnail: variantData.image
                ? { connect: { id: variantData.image } }
                : { connect: { id: data.thumbnail } },
              combinations: { create: combinationsToCreate },
            },
          });
        }
      } else {
        // --- LOGIC FOR SIMPLE PRODUCTS (NO VARIATIONS) ---
        // Create one default ProductVariation record containing the main product's info.
        await tx.productVariation.create({
          data: {
            product: { connect: { id: product.id } },
            // Use product code for SKU and matcherId for consistency
            sku: product.productCode,
            matcherId: product.productCode,
            // Use the main form data for price/stock
            stock: parseOptionalNumber(data.stock, 0),
            regularPrice: Number(data.regularPrice),
            discountPrice: parseOptionalNumber(data.discountPrice),

            // It can use the main product's thumbnail
            thumbnail: { connect: { id: product.thumbnailId } },
            // No combinations for a simple product
            combinations: { create: [] },
          },
        });
      }

      return product;
    });

    // --- Revalidation ---
    revalidatePath("/admin/product");
    revalidatePath("/");
    revalidatePath(`/product/${result.slug}`);
    revalidateTag("products");
    revalidateTag(`product-${result.slug}`);
    console.log("Product created successfully:", result);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error creating product:", error);
    return {
      success: false,
      message: error.message || "প্রোডাক্ট তৈরি করতে একটি ত্রুটি ঘটেছে।",
    };
  }
}
async function getProductById(id) {
  try {
    const data = await prisma.product.findUnique({
      where: { id: id },
      include: {
        category: {
          select: {
            name: true, // Include only the category name
          },
        },
      },
    });
    return { success: true, data }; // Return success with product data
  } catch (error) {
    return { success: false, error: error.message }; // Return structured error
  }
}

export const getProducts = async () => {
  try {
    const data = await prisma.product.findMany({
      include: {
        category: true,
        thumbnail: {
          select: { id: true, name: true },
        },
        gallery: {
          include: {
            media: { select: { id: true, name: true } },
          },
        },
        // [UPDATED] New include structure for variations
        variations: {
          include: {
            thumbnail: { select: { id: true, name: true } },
            // Include the combinations for each variation
            combinations: {
              include: {
                variationName: { select: { id: true, name: true } },
                variationValue: { select: { id: true, value: true } },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Transform the data for a consistent output format
    const transformedData = data.map((product) => ({
      ...product,
      gallery: product.gallery.map((g) => g.media), // Extract media details
      // Use the new transformVariations function
      variations: transformVariations(product.variations),
    }));

    return { success: true, data: transformedData };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export async function getProductCount(params) {
  try {
    const { orderNo, sku, phoneNumber, status, startDate, endDate } = params;
    console.log("params order", params);
    console.log("stardate:", startDate);
    const whereClause = {};
    if (orderNo)
      whereClause.orderNo = { contains: orderNo, mode: "insensitive" };
    if (status) whereClause.status = status;
    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }
    if (sku) {
      whereClause.orderItems = {
        some: { sku: { contains: sku, mode: "insensitive" } },
      };
    }
    if (phoneNumber) {
      whereClause.phoneNumber = { contains: phoneNumber, mode: "insensitive" };
    }

    const count = await prisma.product.count({
      where: whereClause,
    });

    return { success: true, count };
  } catch (error) {
    console.error("Failed to get order count:", error);
    return { success: false, error: error.message };
  }
}
export const getProductsOnScroll = async ({ page = 1, limit = 10 }) => {
  try {
    const offset = (page - 1) * limit;

    const productsFromDb = await prisma.product.findMany({
      skip: offset,
      take: limit,
      include: {
        category: true,
        thumbnail: {
          select: { id: true, name: true },
        },
        gallery: {
          include: {
            media: { select: { id: true, name: true } },
          },
        },
        // [UPDATED] New include structure for variations
        variations: {
          include: {
            thumbnail: { select: { id: true, name: true } },
            // Include the combinations for each variation
            combinations: {
              orderBy: {
                // Optional: ensure combination order is consistent
                createdAt: "asc",
              },
              include: {
                variationName: { select: { id: true, name: true } },
                variationValue: { select: { id: true, value: true } },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Transform the data
    const transformedProducts = productsFromDb.map((product) => {
      // Transform gallery
      const transformedGallery = product.gallery.map((g) => ({
        id: g.media.id,
        name: g.media.name,
      }));

      // Use the new, simpler transformVariations function
      const transformedVariations = transformVariations(product.variations);
      const getDiscountPrice = getMinMax(
        product.variations.map((v) => v.discountPrice || v.regularPrice || 0)
      );
      const getDiscountPriceList =
        getDiscountPrice.min === getDiscountPrice.max
          ? getDiscountPrice.min
          : `${getDiscountPrice.min}-${getDiscountPrice.max}`;
      return {
        ...product,
        discountPrice: getDiscountPriceList,

        thumbnail: product.thumbnail
          ? { id: product.thumbnail.id, name: product.thumbnail.name }
          : null,
        gallery: transformedGallery,
        variations: transformedVariations,
      };
    });

    const totalCount = await prisma.product.count();

    return {
      success: true,
      data: transformedProducts,
      meta: {
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        limit,
      },
    };
  } catch (error) {
    console.error("Error in getProductsOnScroll:", error);
    return { success: false, error: error.message };
  }
};

export const getProductBySlug = async (slug) => {
  try {
    const data = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: {
          select: {
            name: true, // Include only the category name
          },
        },
        thumbnail: {
          select: {
            name: true,
            id: true, // Include thumbnail ID for image URL
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
        variations: {
          include: {
            thumbnail: { select: { name: true, id: true } },
            // Include the combinations for each variation
            combinations: {
              orderBy: {
                // Optional: ensure combination order is consistent
                createdAt: "asc",
              },
              include: {
                variationName: { select: { id: true, name: true } },
                variationValue: { select: { id: true, value: true } },
              },
            },
          },
        },
      },
    });
    // const transformedVariations = transformVariations(data.variations);
    const transformedData = {
      ...data,

      gallery: data.gallery.map((g) => g.media),
    };

    return { success: true, data: transformedData }; // Return success with product data
  } catch (error) {
    return { success: false, error: error.message }; // Return structured error
  }
};
// const cachedGetProductBySlug = cache(
//   (slug) => getProductBySlug_uncached(slug),
//   ["get-product-by-slug"],
//   {
//     tags: (slug) => [`product-${slug}`],
//     revalidate: 3600,
//   }
// );

// // 2. Create and EXPORT a new ASYNC wrapper function.
// //    This is the function your pages will call.
// export const getProductBySlug = async (slug) => {
//   // Inside this async function, we call the cached function.
//   // The 'await' here is not strictly necessary but makes the intent clear.
//   return await cachedGetProductBySlug(slug);
// };
export async function updateProductActions({ id: productId, formData }) {
  if (!productId) {
    return { success: false, message: "Product ID is required for update." };
  }

  try {
    const data = Object.fromEntries(formData.entries());
    console.log(data);
    // --- Parse Product Variations ---
    let submittedVariationsData = [];
    // ✅ FIX: Using 'variations' to match your form data log.
    const variationsJson = data.variations;
    if (variationsJson && typeof variationsJson === "string") {
      try {
        submittedVariationsData = JSON.parse(variationsJson);
        if (!Array.isArray(submittedVariationsData))
          throw new Error("Variations data must be an array.");
      } catch (e) {
        throw new Error("Invalid variation data format.");
      }
    }
    const hasSubmittedVariations = submittedVariationsData.length > 0;

    // --- Robust Number Parsing Helper ---
    const parseOptionalNumber = (value, defaultValue = null) => {
      if (value === undefined || value === null || String(value).trim() === "")
        return defaultValue;
      const num = Number(value);
      return isNaN(num) ? defaultValue : num;
    };

    const result = await prisma.$transaction(async (tx) => {
      // Step 1: Fetch Existing Product
      const existingProduct = await tx.product.findUnique({
        where: { id: productId },
      });
      if (!existingProduct) throw new Error("Product not found for update.");

      // Step 2: Handle Slug
      let newSlug = existingProduct.slug;
      if (data.title && data.title !== existingProduct.title) {
        const baseSlug = await generateSlug(data.slug || data.title);
        newSlug = await generateUniqueSlug(tx, baseSlug, productId);
      }

      // Step 3: Explicitly build the update payload. This is the robust pattern.
      const productUpdateData = {
        title: data.title,
        slug: newSlug,
        videoUrl: data.videoUrl || null,
        description: data.description || null,
        categoryId: data.category || null,
        thumbnailId: data.thumbnail || existingProduct.thumbnailId,
        regularPrice: hasSubmittedVariations
          ? null
          : parseOptionalNumber(data.regularPrice),
        discountPrice: hasSubmittedVariations
          ? null
          : parseOptionalNumber(data.discountPrice),
        stock: hasSubmittedVariations ? 0 : parseOptionalNumber(data.stock, 0),
        weight: parseOptionalNumber(data.weight),
        seoKeyWord: data.seoKeyWord || null,
        seoDescription: data.seoDescription || null,
        isFeatured: Boolean(data.isFeatured === "on"),
        isActive: Boolean(data.isActive === "on"),
        insideDhaka: parseOptionalNumber(data.insideDhaka),
        outSideDhaka: parseOptionalNumber(data.outSideDhaka),
        hasVariations: hasSubmittedVariations,
      };

      // Step 4: Update the Main Product Record
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: productUpdateData,
      });

      // Step 5: Update Gallery (Wipe and Replace)
      await tx.productGallery.deleteMany({
        where: { productId: updatedProduct.id },
      });
      const newMediaIds = data.gallery
        ? data.gallery
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean)
        : [];
      if (newMediaIds.length > 0) {
        await tx.productGallery.createMany({
          data: newMediaIds.map((mediaId) => ({
            productId: updatedProduct.id,
            mediaId: mediaId,
          })),
        });
      }

      // Step 6: Update Variations (Wipe and Replace)
      await tx.productVariation.deleteMany({
        where: { productId: updatedProduct.id },
      });
      if (hasSubmittedVariations) {
        for (const variantData of submittedVariationsData) {
          if (
            !variantData.matcherId ||
            !Array.isArray(variantData.combination) ||
            variantData.combination.length === 0
          )
            continue;

          const variantSku =
            variantData.sku ||
            `${updatedProduct.productCode}-${variantData.matcherId}`;
          const variantStock = parseOptionalNumber(variantData.qty, 0);

          const variantRegularPrice = parseOptionalNumber(
            variantData.regularPrice,
            parseOptionalNumber(data.regularPrice)
          );
          const variantDiscountPrice = parseOptionalNumber(
            variantData.discountPrice,
            parseOptionalNumber(data.discountPrice) ||
              parseOptionalNumber(data.regularPrice)
          );
          const variantWeight = parseOptionalNumber(
            variantData.weight,
            updatedProduct.weight
          );

          let variantThumbnailId = null;
          if (
            typeof variantData.image === "string" &&
            variantData.image.length > 0
          ) {
            variantThumbnailId = variantData.image;
          } else if (
            typeof variantData.image === "object" &&
            variantData.image?.id
          ) {
            variantThumbnailId = variantData.image.id;
          } else {
            variantThumbnailId = updatedProduct.thumbnailId;
          }

          const combinationsToCreate = variantData.combination
            .map((combo) =>
              combo.variation?.id && combo.value?.id
                ? {
                    variationNameId: combo.variation.id,
                    variationValueId: combo.value.id,
                  }
                : null
            )
            .filter(Boolean);

          if (combinationsToCreate.length === 0) continue;

          await tx.productVariation.create({
            data: {
              productId: updatedProduct.id,
              matcherId: variantData.matcherId,
              sku: variantSku,
              stock: variantStock,
              regularPrice: variantRegularPrice,
              discountPrice: variantDiscountPrice,
              weight: variantWeight,
              thumbnailId: variantThumbnailId,
              combinations: { create: combinationsToCreate },
            },
          });
        }
      }
      console.log("Updated product with variations:", updatedProduct);
      return updatedProduct;
    });

    // --- Revalidation ---
    revalidatePath("/admin/product");
    revalidatePath("/");
    revalidatePath(`/product/${result.slug}`);
    revalidateTag("products");
    revalidateTag(`product-${result.slug}`);

    return { success: true, data: result };
  } catch (error) {
    if (error) {
      console.error("Caught error in updateProductAction:", error);
    } else {
      console.error(
        "Caught a null error in updateProductAction. This usually indicates an invalid data shape was passed to Prisma."
      );
    }

    let errorMessage = "An unknown error occurred.";
    if (error instanceof Error) errorMessage = error.message;
    if (error?.code === "P2002" && error.meta?.target?.includes("slug")) {
      return {
        success: false,
        message: `Slug "${data.slug}" is already in use.`,
      };
    }
    return { success: false, message: errorMessage };
  }
}

export async function updateProductAction({ id: productId, formData }) {
  if (!productId) {
    return { success: false, message: "Product ID is required for update." };
  }

  try {
    const data = Object.fromEntries(formData.entries());

    // --- Basic Validation ---
    if (!data?.title || !data?.thumbnail) {
      throw new Error(
        "সব ফিল্ড গুলতে তথ্য দিন। (Title, Regular Price, Thumbnail are required)"
      );
    }

    // --- Parse Product Variations ---
    let submittedVariationsData = [];
    if (data.variations && typeof data.variations === "string") {
      try {
        submittedVariationsData = JSON.parse(data.variations);
        if (!Array.isArray(submittedVariationsData))
          throw new Error("Variations data must be an array.");
      } catch (e) {
        throw new Error("Invalid variation data format.");
      }
    }
    const hasSubmittedVariations = submittedVariationsData.length > 0;

    // --- Robust Number Parsing Helper ---
    const parseOptionalNumber = (value, defaultValue = null) => {
      if (value === undefined || value === null || String(value).trim() === "")
        return defaultValue;
      const num = Number(value);
      return isNaN(num) ? defaultValue : num;
    };

    const result = await prisma.$transaction(async (tx) => {
      // Step 1: Fetch Existing Product
      const existingProduct = await tx.product.findUnique({
        where: { id: productId },
      });
      if (!existingProduct) throw new Error("Product not found for update.");

      // Step 2: Handle Slug
      let newSlug = existingProduct.slug;
      if (data.title && data.title !== existingProduct.title) {
        const baseSlug = await generateSlug(data.slug || data.title);
        newSlug = await generateUniqueSlug(tx, baseSlug, productId);
      }

      // Step 3: Prepare the update payload for the main Product model [MODIFIED]
      // Price, stock are no longer part of the main product.
      const productUpdateData = {
        title: data.title,
        slug: newSlug,
        description: data.description || null,
        categoryId: data.category || null,
        thumbnailId: data.thumbnail || existingProduct.thumbnailId,
        weight: parseOptionalNumber(data.weight), // Base weight
        dimensions: data.dimensions || null,
        seoKeyWord: data.seoKeyWord || null,
        seoDescription: data.seoDescription || null,
        isFeatured: Boolean(data.isFeatured === "on"),
        isActive: Boolean(data.isActive === "on"),
        // The hasVariations flag is crucial for the UI.
        hasVariations: hasSubmittedVariations,
      };

      // Step 4: Update the Main Product Record
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: productUpdateData,
      });

      // Step 5: Update Gallery (Wipe and Replace strategy)
      await tx.productGallery.deleteMany({
        where: { productId: updatedProduct.id },
      });
      const newMediaIds = data.gallery
        ? data.gallery
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean)
        : [];
      if (newMediaIds.length > 0) {
        await tx.productGallery.createMany({
          data: newMediaIds.map((mediaId) => ({
            productId: updatedProduct.id,
            mediaId: mediaId,
          })),
        });
      }

      // Step 6: Update Variations (Wipe and Replace strategy) [MODIFIED]
      // First, delete all existing variations for this product.
      await tx.productVariation.deleteMany({
        where: { productId: updatedProduct.id },
      });

      // Now, create the new set of variations based on submitted data.
      if (hasSubmittedVariations) {
        // --- LOGIC FOR PRODUCTS WITH USER-DEFINED VARIATIONS ---
        const mainProductRegularPrice = Number(data.regularPrice);

        for (const variantData of submittedVariationsData) {
          if (!variantData.matcherId || !Array.isArray(variantData.combination))
            continue;

          const combinationsToCreate = variantData.combination
            .map((combo) =>
              combo.variation?.id && combo.value?.id
                ? {
                    variationNameId: combo.variation.id,
                    variationValueId: combo.value.id,
                  }
                : null
            )
            .filter(Boolean);

          if (combinationsToCreate.length === 0) continue;

          await tx.productVariation.create({
            data: {
              product: { connect: { id: updatedProduct.id } },
              matcherId: variantData.matcherId,
              sku:
                variantData.sku ||
                `${updatedProduct.productCode}-${variantData.matcherId}`,
              stock: parseOptionalNumber(variantData.qty, 0),
              regularPrice: parseOptionalNumber(
                variantData.regularPrice,
                mainProductRegularPrice
              ),
              discountPrice: parseOptionalNumber(
                variantData.discountPrice,
                parseOptionalNumber(data.discountPrice)
              ),
              thumbnail: variantData.image
                ? { connect: { id: variantData.image } }
                : { connect: { id: updatedProduct.thumbnailId } },
              combinations: { create: combinationsToCreate },
            },
          });
        }
      } else {
        // --- LOGIC FOR SIMPLE PRODUCTS (NO VARIATIONS) ---
        // Create one default ProductVariation record.
        await tx.productVariation.create({
          data: {
            product: { connect: { id: updatedProduct.id } },
            sku: updatedProduct.productCode,
            matcherId: updatedProduct.productCode,
            stock: parseOptionalNumber(data.stock, 0),
            regularPrice: Number(data.regularPrice),
            discountPrice: parseOptionalNumber(data.discountPrice),
            // Use the main product's thumbnail as the default
            thumbnail: { connect: { id: updatedProduct.thumbnailId } },
            combinations: { create: [] },
          },
        });
      }

      return updatedProduct;
    });

    // --- Revalidation ---
    revalidatePath("/admin/product");
    revalidatePath("/");
    revalidatePath(`/product/${result.slug}`);
    revalidateTag("products");
    revalidateTag(`product-${result.slug}`);
    console.log("Product updated successfully:", result);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error updating product:", error);
    let errorMessage = "An unknown error occurred while updating the product.";
    if (error instanceof Error) errorMessage = error.message;
    if (error?.code === "P2002" && error.meta?.target?.includes("slug")) {
      errorMessage = `Slug "${data.slug}" is already in use. Please choose another.`;
    }
    return { success: false, message: errorMessage };
  }
}
export async function deleteProductById(productId) {
  if (!productId) {
    return { success: false, message: "Product ID is required for deletion." };
  }

  try {
    // With cascading deletes, Prisma handles the deletion of related
    // ProductGallery, ProductVariation, and Combination records automatically.
    const deletedProduct = await prisma.product.delete({
      where: { id: productId },
      select: { slug: true }, // Select slug for revalidation
    });

    // --- Revalidation ---
    revalidatePath("/admin/product");
    revalidatePath("/");
    revalidatePath(`/product/${deletedProduct.slug}`);
    revalidateTag(`product-${deletedProduct.slug}`);
    revalidateTag("products");

    return { success: true, message: "Product deleted successfully." };
  } catch (error) {
    console.error("Error deleting product:", error);
    if (error.code === "P2025") {
      // Prisma's "Record to delete not found"
      return {
        success: false,
        message: "Product not found or already deleted.",
      };
    }
    return {
      success: false,
      message: error.message || "প্রোডাক্ট ডিলিট করতে একটি ত্রুটি ঘটেছে।",
    };
  }
}

export const updateProductStatus = async ({ id, value }) => {
  console.log(id, value);
  try {
    const data = await prisma.product.update({
      where: { id },
      data: { isActive: value },
    });

    revalidatePath("/");
    revalidatePath("/admin/product");
    revalidateTag("products");
    revalidateTag(`product-${id}`);

    return { success: true, data };
  } catch (error) {
    return { success: false, message: error.message };
  }
};
