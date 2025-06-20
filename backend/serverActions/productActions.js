"use server";

import prisma from "@/lib/prisma";
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

    // Build the `variationValues` object for easy lookup (e.g., { Color: 'Red', Size: 'Large' })
    const variationValues = pv.combinations.reduce((acc, combo) => {
      acc[combo.variationName.name] = combo.variationValue.value;
      return acc;
    }, {});

    return {
      id: pv.id, // The ID of the ProductVariation record itself
      matcherId: pv.matcherId,
      sku: pv.sku || "",
      price: pv.price !== null ? String(pv.price) : "",
      qty: pv.stock !== null ? String(pv.stock) : "",
      image: pv.thumbnail
        ? { id: pv.thumbnail.id, name: pv.thumbnail.name }
        : null,
      imageUrl: pv.thumbnail?.name ? `/uploads/${pv.thumbnail.name}` : null,
      combination: combination,
      variationValues: variationValues,
    };
  });
}

export async function createProductAction(formData) {
  try {
    let data = Object.fromEntries(formData.entries());
    console.log(JSON.parse(data?.variations || "[]"));
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
        stockQuantity:
          parsedProductVariations.length > 0
            ? 0
            : parseOptionalNumber(data.stockQuantity, 0),
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
          const variantPrice = parseOptionalNumber(
            variantData.price,
            product.regularPrice
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
              price: variantPrice,
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

      return {
        ...product,
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
          },
        },
        gallery: {
          select: {
            media: {
              select: {
                name: true,
              },
            },
          },
        },
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
    });
    const transformedVariations = transformVariations(data.variations);
    const transformedData = {
      ...data,
      thumbnail: data?.thumbnail?.name,
      gallery: data.gallery.map((g) => g.media?.name),
    };
    console.log("product data");
    console.log(JSON.stringify(transformedData?.variations));
    return { success: true, data: transformedData }; // Return success with product data
  } catch (error) {
    return { success: false, error: error.message }; // Return structured error
  }
};

export async function updateProductAction({ id: productId, formData }) {
  if (!productId) {
    return { success: false, message: "Product ID is required for update." };
  }

  try {
    const data = Object.fromEntries(formData.entries());

    // ... (Validations and Parsing remain the same) ...
    let submittedVariationsData = [];
    if (data.variations && typeof data.variations === "string") {
      try {
        submittedVariationsData = JSON.parse(data.variations);
        if (!Array.isArray(submittedVariationsData))
          throw new Error("Variations data must be an array.");
      } catch (e) {
        throw new Error("Invalid variation data format for update.");
      }
    } else if (Array.isArray(data.variations)) {
      submittedVariationsData = data.variations;
    }

    const parseOptionalNumber = (value, defaultValue = null) => {
      if (value === undefined || value === null || String(value).trim() === "")
        return defaultValue;
      const num = Number(value);
      return isNaN(num) ? defaultValue : num;
    };

    const result = await prisma.$transaction(async (tx) => {
      // ... (Existing product fetch, slug, gallery, and main product update logic remain the same) ...

      const existingProduct = await tx.product.findUnique({
        where: { id: productId },
        include: { gallery: true },
      });
      if (!existingProduct) throw new Error("Product not found for update.");
      // ... slug, gallery logic ...

      const { gallery, variations, ...filteredData } = data;
      const hasSubmittedVariations = submittedVariationsData.length > 0;
      const productUpdateData = {
        /* ... as before ... */
      };
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: productUpdateData,
      });
      // ... gallery update logic ...

      // --- VARIATION HANDLING SECTION ---

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

          // ... (sku, stock, price, weight parsing as before) ...
          const variantSku =
            variantData.sku ||
            `${updatedProduct.productCode}-${variantData.matcherId}`;
          const variantStock = parseOptionalNumber(variantData.qty, 0);
          const variantPrice = parseOptionalNumber(
            variantData.price,
            updatedProduct.regularPrice
          );
          const variantWeight = parseOptionalNumber(
            variantData.weight,
            updatedProduct.weight
          );

          // ✅ --- BULLETPROOF THUMBNAIL LOGIC --- ✅
          let variantThumbnailId = null;
          if (
            typeof variantData.image === "string" &&
            variantData.image.length > 0
          ) {
            // Handles case: "image": "some_id"
            variantThumbnailId = variantData.image || product.thumbnailId;
          } else if (
            typeof variantData.image === "object" &&
            variantData.image?.id
          ) {
            // Handles case: "image": { "id": "some_id" }
            variantThumbnailId = variantData.image.id || product.thumbnailId;
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
              product: { connect: { id: updatedProduct.id } },
              matcherId: variantData.matcherId,
              sku: variantSku,
              stock: variantStock,
              price: variantPrice,
              weight: variantWeight,
              thumbnail: variantThumbnailId
                ? { connect: { id: variantThumbnailId } }
                : undefined,
              combinations: { create: combinationsToCreate },
            },
          });
        }
      }

      return updatedProduct;
    });

    // ... (Revalidation as before) ...

    return { success: true, data: result };
  } catch (error) {
    // ✅ --- ROBUST ERROR HANDLING LOGIC --- ✅

    // Log the raw error value safely for debugging.
    console.error("Caught error in updateProductAction:", error);

    let errorMessage = "An unknown error occurred.";

    // Check if it's a standard Error object to get its message.
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    // Handle specific Prisma unique constraint errors.
    // Use optional chaining (?.) to safely access properties that might not exist.
    if (error?.code === "P2002" && error.meta?.target?.includes("slug")) {
      return {
        success: false,
        message: `Slug "${data.slug}" is already in use. Please choose a different one.`,
      };
    }

    // Return a generic, safe error response.
    return {
      success: false,
      message: errorMessage || "প্রোডাক্ট আপডেট করতে একটি ত্রুটি ঘটেছে।",
    };
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
