"use server";

import prisma from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { cloudinaryDestroy, deleteMultipleFile } from "../utils/cloudinary";
import { newSlug } from "../utils/generateSlug";

// export async function createProductAction(formData) {
//   try {
//     // Parse and validate form data
//     let data = Object.fromEntries(formData.entries());
//     console.log(data);
//     if (
//       !data?.title ||
//       !data?.regularPrice ||
//       !formData.get("mainImage").size > 0
//     ) {
//       throw new Error("সব ফিল্ড গুলতে তথ্য দিন।");
//     }

//     // Generate or refine slug
//     const slug = await newSlug(data?.slug || data?.title);

//     // Handle main image
//     const mainImageFile = formData.get("mainImage");
//     let mainImageUpload;
//     if (mainImageFile) {
//       mainImageUpload = await cloudinaryUpload({
//         image: mainImageFile,
//         tag: data?.seoKeyWord,
//         slug,
//         perifix: "_mainImage",
//       });
//     }

//     //Image Gallery Upload
//     let imageGalleryUploads = [];
//     const imageGalleryFiles = formData.getAll("imageGallery");
//     const validFiles = imageGalleryFiles.filter((file) => file.size > 0);
//     if (validFiles.length > 0) {
//       await Promise.all(
//         imageGalleryFiles.map(async (file, index) => {
//           const upload = await cloudinaryUpload({
//             image: file,
//             tag: data?.seoKeyWord,
//             slug: `${slug}_${index + 1}`,
//             perifix: "_galleryImage",
//           });
//           const formate = `${upload.display_name}.${upload.format}`;
//           imageGalleryUploads.push(formate);
//         })
//       );
//     }
//     let productCode = await prisma.ProductCodeCounter.findFirst();

//     // If the counter doesn't exist, initialize it
//     if (!productCode) {
//       productCode = await prisma.ProductCodeCounter.create({
//         data: { lastProductCode: 1000 },
//       });
//     }

//     // Increment the order number
//     const newProductCode = productCode.lastOrderNumber + 1;
//     const preparedData = {
//       ...data,
//       productCode: newProductCode,
//       isActive: data?.isActive ? true : false,
//       isFeatured: data?.isFeatured ? true : false,
//       slug: slug,
//       category: {
//         connect: { id: data?.category },
//       },
//       mainImage: `${mainImageUpload.display_name}.${mainImageUpload.format}`,
//       imageGallery: imageGalleryUploads,
//       regularPrice: data?.regularPrice && Number(data?.regularPrice),
//       discountPrice: data?.discountPrice && Number(data?.discountPrice),
//       stockQuantity: data?.stockQuantity && Number(data?.stockQuantity),
//       insideDhaka: data?.insideDhaka && Number(data?.insideDhaka),
//       outSideDhaka: data?.outSideDhaka && Number(data?.outSideDhaka),
//       weight: data?.weight ? Number(data?.weight) : null,
//     };
//     const result = await prisma.$transaction(async (tx) => {
//       return await tx.product.create({
//         data: preparedData,
//       });
//     });

//     revalidatePath("/admin/product");
//     revalidatePath("/");
//     revalidateTag("products");

//     return { success: true, result }; // Return success
//   } catch (error) {
//     return { success: false, message: error.message }; // Return structured error
//   } finally {
//     await prisma.$disconnect();
//   }
// }

// Helper function to transform flat variation attributes into grouped variants
// Helper function to transform flat variation attributes into grouped variants
function transformVariations(inputProductVariations) {
  if (!inputProductVariations || inputProductVariations.length === 0) {
    return [];
  }

  const groupedByMatcherId = new Map();

  for (const item of inputProductVariations) {
    // 'item' here is one ProductVariation record from Prisma
    // item.id is the ObjectId of this specific ProductVariation record
    // item.thumbnailId is the ID of the Media record for its thumbnail
    // item.thumbnail.name is the name of that Media record

    if (!groupedByMatcherId.has(item.matcherId)) {
      // Initialize the group for this matcherId
      groupedByMatcherId.set(item.matcherId, {
        // Store the ID of the first ProductVariation record encountered for this matcherId.
        // This will become the 'id' of the grouped variant object.
        _sourceRecordId: item.id, // This is the database ID of the ProductVariation record itself

        combination: [],
        variationValues: {},
        matcherId: item.matcherId,
        sku: item.sku || "",
        price:
          item.price !== undefined && item.price !== null
            ? String(item.price)
            : "",
        qty:
          item.stock !== undefined && item.stock !== null
            ? String(item.stock)
            : "",
        // Initialize image object for the group using id and name.
        image: item.thumbnailId
          ? { id: item.thumbnailId, name: item.thumbnail?.name || null }
          : null,
        imageUrl: item.thumbnail?.name
          ? `/uploads/${item.thumbnail.name}`
          : null,
      });
    }

    const group = groupedByMatcherId.get(item.matcherId);

    // Add to combination array
    group.combination.push({
      variation: {
        id: item.variationName.id,
        name: item.variationName.name,
      },
      value: {
        id: item.variationValue.id,
        value: item.variationValue.value,
      },
    });

    // Add to variationValues object
    group.variationValues[item.variationName.name] = item.variationValue.value;

    // Update common fields if they were empty and this item has them
    // These generally should be consistent for a given matcherId from the first item.
    if (group.sku === "" && item.sku) group.sku = item.sku;
    if (group.price === "" && item.price !== undefined && item.price !== null)
      group.price = String(item.price);
    if (group.qty === "" && item.stock !== undefined && item.stock !== null)
      group.qty = String(item.stock);

    // Fallback for image if the first item didn't have one
    if (group.image === null && item.thumbnailId) {
      group.image = {
        id: item.thumbnailId,
        name: item.thumbnail?.name || null,
      };
      if (item.thumbnail?.name) {
        group.imageUrl = `/uploads/${item.thumbnail.name}`;
      }
    }
  }

  // Convert the Map values to an array
  return Array.from(groupedByMatcherId.values()).map((group) => {
    return {
      id: group._sourceRecordId, // Use the stored ProductVariation record's ID as the group's ID
      combination: group.combination,
      variationValues: group.variationValues,
      matcherId: group.matcherId, // Retain matcherId explicitly
      sku: group.sku,
      price: group.price,
      qty: group.qty,
      image: group.image, // This will be the object { id: "...", name: "..." } or null
      imageUrl: group.imageUrl, // Optional: full URL
    };
  });
}
export async function createProductActions(formData) {
  try {
    let data = Object.fromEntries(formData.entries());
    console.log(data);
    if (!data?.title || !data?.regularPrice || !data?.thumbnail) {
      throw new Error("সব ফিল্ড গুলতে তথ্য দিন।");
    }

    const slug = await newSlug(data?.slug || data?.title);

    let productCode = await prisma.ProductCodeCounter.findFirst();
    if (!productCode) {
      productCode = await prisma.ProductCodeCounter.create({
        data: { lastProductCode: 1000 },
      });
    }

    const newProductCode = (productCode.lastProductCode + 1).toString();

    // Convert `gallery` string into an array
    const mediaIds = data?.gallery
      ? data.gallery
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id)
      : [];
    const { gallery, ...filteredData } = data;
    const preparedData = {
      ...filteredData,
      productCode: newProductCode,
      isActive: Boolean(data?.isActive),
      isFeatured: Boolean(data?.isFeatured),
      slug: slug,
      category: data?.category
        ? { connect: { id: data?.category } }
        : undefined,
      thumbnail: { connect: { id: data?.thumbnail } },
      regularPrice: Number(data?.regularPrice),
      discountPrice: data?.discountPrice ? Number(data?.discountPrice) : null,
      stockQuantity: Number(data?.stockQuantity || 0),
      insideDhaka: data?.insideDhaka ? Number(data?.insideDhaka) : null,
      outSideDhaka: data?.outSideDhaka ? Number(data?.outSideDhaka) : null,
      weight: data?.weight ? Number(data?.weight) : null,
    };

    // 🔹 Create the product
    const product = await prisma.product.create({
      data: preparedData,
    });

    // 🔹 Insert product gallery separately
    if (mediaIds.length > 0) {
      await prisma.productGallery.createMany({
        data: mediaIds.map((mediaId) => ({
          productId: product.id,
          mediaId: mediaId,
        })),
      });
    }

    revalidatePath("/admin/product");
    revalidatePath("/");
    revalidateTag("products");

    return { success: true, data: product };
  } catch (error) {
    console.error("Error creating product:", error.message);
    return { success: false, message: error.message };
  } finally {
    await prisma.$disconnect();
  }
}
export async function createProductAction(formData) {
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
      // If it's already an array (e.g. passed programmatically if not from FormData)
      parsedProductVariations = data.variations;
    }

    const slug = await newSlug(data?.slug || data?.title);

    // --- Prisma Transaction ---
    const result = await prisma.$transaction(async (tx) => {
      // --- Product Code Generation ---
      let productCodeCounter = await tx.ProductCodeCounter.findFirst();
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
      const mainProductRegularPrice = Number(data.regularPrice); // Already validated

      const preparedData = {
        ...filteredData,
        productCode: newProductCode,
        isActive: Boolean(
          data?.isActive === "on" ||
            data?.isActive === true ||
            data?.isActive === "true"
        ),
        isFeatured: Boolean(
          data?.isFeatured === "on" ||
            data?.isFeatured === true ||
            data?.isFeatured === "true"
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
        // Ensure other fields from Product schema are handled
        mainImage: data?.mainImage || null, // Example if you have this field
        imageGallery: data?.imageGallery
          ? data.imageGallery
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s)
          : [], // Example
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

      // 🔹 Create Product Variations if they exist
      if (parsedProductVariations.length > 0) {
        const productVariationsToCreate = [];
        for (const variantData of parsedProductVariations) {
          if (
            !variantData.matcherId ||
            !Array.isArray(variantData.combination) ||
            variantData.combination.length === 0
          ) {
            console.warn(
              "Skipping incomplete variant data (missing matcherId or combination array):",
              variantData
            );
            continue;
          }

          // SKU for this specific variant instance
          const variantSku =
            variantData.sku ||
            `${product.productCode}-${variantData.matcherId}`;
          // Stock, price, weight for this specific variant instance
          const variantStock = parseOptionalNumber(variantData.qty, 0); // Default to 0 stock
          const variantPrice = parseOptionalNumber(
            variantData.price,
            product.regularPrice
          ); // Default to main product price
          const variantWeight = parseOptionalNumber(
            variantData.weight,
            product.weight
          ); // Default to main product weight
          const variantThumbnailId = variantData.image || product.thumbnailId; // Default to main product thumbnail

          for (const attrPair of variantData.combination) {
            if (!attrPair.variation?.id || !attrPair.value?.id) {
              console.warn(
                "Skipping variation attribute pair with missing IDs:",
                attrPair,
                "for matcherId:",
                variantData.matcherId
              );
              continue;
            }
            productVariationsToCreate.push({
              productId: product.id,
              sku: variantSku,
              stock: variantStock,
              price: variantPrice,
              thumbnailId: variantThumbnailId,
              matcherId: variantData.matcherId,
              // Using field names from your schema (variaionNameId, variaionValueId)
              variationNameId: attrPair.variation.id,
              variationValueId: attrPair.value.id,
              weight: variantWeight,
            });
          }
        }

        if (productVariationsToCreate.length > 0) {
          await tx.productVariation.createMany({
            data: productVariationsToCreate,
          });
        } else if (
          parsedProductVariations.length > 0 &&
          productVariationsToCreate.length === 0
        ) {
          // This implies all parsedProductVariations items were malformed
          throw new Error(
            "সমস্ত ভ্যারিয়েশন তথ্য অসম্পূর্ণ বা ভুল ছিল। (All provided variation data was incomplete or incorrect.)"
          );
        }
      }
      return product; // Return the created product from the transaction
    });

    // --- Revalidation ---
    revalidatePath("/admin/product");
    revalidatePath("/");
    revalidatePath(`/product/${slug}`); // For individual product page
    revalidateTag("products");
    revalidateTag(`product-${slug}`);

    return { success: true, data: result };
  } catch (error) {
    console.log("Error creating product:", error);
    return {
      success: false,
      message: error.message || "প্রোডাক্ট তৈরি করতে একটি ত্রুটি ঘটেছে।",
    };
  } finally {
    // Prisma client instance is usually managed globally in Next.js.
    // Explicitly disconnecting might not be necessary.
    // await prisma.$disconnect();
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
          select: {
            id: true,
            name: true,
          },
        },
        gallery: {
          include: {
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

    // Transform the gallery field to extract only media details
    const transformedData = data.map((product) => ({
      ...product,
      gallery: product.gallery.map((g) => g.media), // Extract only media details
    }));

    return { success: true, data: transformedData };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getProductsOnScroll = async ({ page = 1, limit = 5 }) => {
  try {
    const offset = (page - 1) * limit;

    const productsFromDb = await prisma.product.findMany({
      skip: offset,
      take: limit,
      include: {
        category: true, // Include category details
        thumbnail: {
          // Include product's main thumbnail
          select: {
            id: true,
            name: true, // Or full path if stored, or just name to construct URL later
          },
        },
        gallery: {
          // Include product gallery images
          include: {
            media: {
              select: {
                id: true,
                name: true, // Or full path
              },
            },
          },
        },
        variations: {
          // Include all related ProductVariation records
          include: {
            thumbnail: {
              // Thumbnail for the specific variation attribute (if any)
              select: {
                id: true,
                name: true, // Or full path
              },
            },
            variationName: {
              // The VariationName (e.g., "Color", "Size")
              select: {
                id: true,
                name: true,
              },
            },
            variationValue: {
              // The VariationValue (e.g., "Red", "XL")
              select: {
                id: true,
                value: true,
              },
            },
          },
        },
      },
      orderBy: {
        // Optional: Add an order to ensure consistent pagination
        createdAt: "desc",
      },
    });

    // console.log("Fetched products raw from DB:", JSON.stringify(productsFromDb, null, 2)); // For deep debugging

    // Transform the data
    const transformedProducts = productsFromDb.map((product) => {
      // Transform gallery
      const transformedGallery = product.gallery.map((g) => ({
        id: g.media.id,
        name: g.media.name,
      }));

      // Transform variations using the helper function
      // Ensure product.variations is an array before passing
      const transformedVariations =
        product.hasVariations && Array.isArray(product.variations)
          ? transformVariations(product.variations)
          : [];

      return {
        ...product,
        thumbnail: product.thumbnail
          ? {
              id: product.thumbnail.id,
              name: product.thumbnail.name,
            }
          : null,
        gallery: transformedGallery,
        variations: transformedVariations,
      };
    });

    // console.log("Transformed products:", JSON.stringify(transformedProducts, null, 2)); // For deep debugging

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
    console.error("Error in getProductsOnScroll:", error); // Log the full error on the server
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
            thumbnail: {
              select: {
                id: true,
                name: true,
              },
            },
            variationName: {
              select: {
                id: true,
                name: true,
              },
            },
            variationValue: {
              select: {
                id: true,
                value: true,
              },
            },
          },
        },
      },
    });
    const transformedData = {
      ...data,
      thumbnail: data?.thumbnail?.name,
      gallery: data.gallery.map((g) => g.media?.name),
    };

    return { success: true, data: transformedData }; // Return success with product data
  } catch (error) {
    return { success: false, error: error.message }; // Return structured error
  }
};

// export const updateProductAction = async ({ productId, formData, slug }) => {
//   const data = Object.fromEntries(formData.entries());
//   console.log(data);
//   const product = await prisma.product.findUnique({
//     where: {
//       id: productId,
//     },
//   });
//   if (!product) {
//     throw new Error("Product Not found");
//   }

//   let UpdatedData;

//   UpdatedData = {
//     ...data,
//     isActive: data?.isActive ? true : false,
//     isFeatured: data?.isFeatured ? true : false,
//     regularPrice: data?.regularPrice && Number(data?.regularPrice),
//     discountPrice: data?.discountPrice && Number(data?.discountPrice),
//     stockQuantity: data?.stockQuantity && Number(data?.stockQuantity),
//     insideDhaka: data?.insideDhaka && Number(data?.insideDhaka),
//     outSideDhaka: data?.outSideDhaka && Number(data?.outSideDhaka),
//     weight: data?.weight ? Number(data?.weight) : null,

//     category: {
//       connect: { id: data?.category },
//     },
//   };

//   if (product?.slug !== data?.slug) {
//     // Generate or refine slug
//     const slug = await newSlug(data?.slug || data?.title);
//     UpdatedData = {
//       ...UpdatedData,
//       slug: slug,
//     };
//   }
//   const mainImageFile = formData.get("mainImage");

//   if (mainImageFile) {
//     const upload = await cloudinaryUpload({
//       image: mainImageFile,
//       tag: data?.seoKeyWord,
//       slug,
//       perifix: "_mainImage",
//     });

//     /// Delete previous photo
//     if (product?.mainImage) {
//       await cloudinaryDestroy(product?.mainImage);
//     }

//     const mainImage = `${upload.display_name}.${upload.format}`;
//     UpdatedData = {
//       ...UpdatedData,
//       mainImage,
//     };
//   }

//   //Image Gallery Upload
//   let imageGalleryUploads = [];
//   const imageGalleryFiles = formData.getAll("imageGallery");
//   const validFiles = imageGalleryFiles.filter((file) => file.size > 0);

//   if (validFiles.length > 0) {
//     await Promise.all(
//       imageGalleryFiles.map(async (file, index) => {
//         const upload = await cloudinaryUpload({
//           image: file,
//           tag: data?.seoKeyWord,
//           slug: `${slug}_${index + 1}`,
//           perifix: "_galleryImage",
//         });
//         const formate = `${upload.display_name}.${upload.format}`;
//         imageGalleryUploads.push(formate);
//         /// Delete Previous image gallery
//         if (product.imageGallery && product.imageGallery?.length > 0) {
//           await deleteMultipleFile(product.imageGallery);
//         }
//       })
//     );
//   }
//   if (imageGalleryUploads?.length > 0) {
//     UpdatedData = {
//       ...UpdatedData,
//       imageGallery: imageGalleryUploads,
//     };
//   }

//   try {
//     const update = await prisma.product.update({
//       where: { id: productId },
//       data: UpdatedData,
//     });

//     revalidatePath("/");
//     revalidatePath("/admin/product");
//     revalidatePath(`/product/${slug}`);
//     revalidatePath(`/buynow/${slug}`);
//     revalidateTag("products");
//     revalidateTag(`product-${slug}`);
//     revalidateTag(`product-${productId}`);
//     return {
//       success: true,
//       message: "সফল ভাবে আপডেইট করা হয়েছে।",
//       data: update,
//     };
//   } catch (error) {
//     return {
//       success: false,
//       message: error?.message || "আবার চেস্টা করুন।",
//     };
//   }
// };
export async function updateProductAction({ id: productId, formData, slug }) {
  try {
    let data = Object.fromEntries(formData.entries());

    if (!data?.title || !data?.regularPrice || !data?.thumbnail) {
      throw new Error("সব ফিল্ড গুলতে তথ্য দিন।");
    }

    const slug = await newSlug(data?.slug || data?.title);

    // Convert `gallery` string into an array
    const mediaIds = data?.gallery
      ? data.gallery
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id)
      : [];

    const { gallery, ...filteredData } = data;

    const preparedData = {
      ...filteredData,
      isActive: Boolean(data?.isActive),
      isFeatured: Boolean(data?.isFeatured),
      slug: slug,
      category: data?.category
        ? { connect: { id: data?.category } }
        : undefined,
      thumbnail: { connect: { id: data?.thumbnail } },
      regularPrice: Number(data?.regularPrice),
      discountPrice: data?.discountPrice ? Number(data?.discountPrice) : null,
      stockQuantity: Number(data?.stockQuantity || 0),
      insideDhaka: data?.insideDhaka ? Number(data?.insideDhaka) : null,
      outSideDhaka: data?.outSideDhaka ? Number(data?.outSideDhaka) : null,
      weight: data?.weight ? Number(data?.weight) : null,
    };

    // 🔹 Update the product
    const product = await prisma.product.update({
      where: { id: productId },
      data: preparedData,
    });

    // 🔹 Manage Product Gallery (Remove old images & add new ones)
    const existingGallery = await prisma.productGallery.findMany({
      where: { productId },
      select: { mediaId: true },
    });

    const existingMediaIds = existingGallery.map((g) => g.mediaId);

    // 🔸 Remove images that are no longer in the updated gallery
    const mediaToRemove = existingMediaIds.filter(
      (id) => !mediaIds.includes(id)
    );
    if (mediaToRemove.length > 0) {
      await prisma.productGallery.deleteMany({
        where: { productId, mediaId: { in: mediaToRemove } },
      });
    }

    // 🔸 Add new images that are not already in the gallery
    const mediaToAdd = mediaIds.filter((id) => !existingMediaIds.includes(id));
    if (mediaToAdd.length > 0) {
      await prisma.productGallery.createMany({
        data: mediaToAdd.map((mediaId) => ({
          productId,
          mediaId,
        })),
      });
    }

    revalidatePath("/admin/product");
    revalidatePath("/");
    revalidateTag("products");

    return { success: true, data: product };
  } catch (error) {
    console.error("Error updating product:", error.message);
    return { success: false, message: error.message };
  } finally {
    await prisma.$disconnect();
  }
}

export async function deleteProductById(id) {
  try {
    // Fetch the product to get its image data
    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        mainImage: true,
        imageGallery: true,
        slug: true,
      },
    });

    if (!product) {
      throw new Error("Product not found");
    }

    // Delete main image
    if (product?.mainImage) {
      await cloudinaryDestroy(product?.mainImage);
    }

    // Delete gallery images
    if (product?.imageGallery && product.imageGallery?.length > 0) {
      await deleteMultipleFile(product?.imageGallery);
    }

    // Delete product from the database
    const deletedProduct = await prisma?.product?.delete({
      where: { id },
    });

    // Revalidate paths and tags
    if (deletedProduct?.slug) {
      revalidatePath(`/product/${deletedProduct.slug}`);
      revalidatePath(`/buynow/${deletedProduct.slug}`);
      revalidateTag(`product-${deletedProduct.slug}`);
    }

    revalidatePath("/");
    revalidatePath("/admin/product");
    revalidateTag("products");
    revalidateTag(`product-${id}`);

    return {
      success: true,
      data: "Product deleted successfully, including its images.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to delete the product.",
    };
  } finally {
    await prisma.$disconnect();
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
