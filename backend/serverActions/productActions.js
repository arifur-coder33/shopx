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

export async function createProductActions(formData) {
  try {
    let data = Object.fromEntries(formData.entries());
 
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
      throw new Error("সব ফিল্ড গুলতে তথ্য দিন। (Title, Regular Price, Thumbnail are required)");
    }
    if (isNaN(parseFloat(data.regularPrice)) || parseFloat(data.regularPrice) < 0) {
        throw new Error("Regular price must be a valid number.");
    }


    // --- Parse Product Variations ---
    let parsedProductVariations = [];
    if (data.productVariation && typeof data.productVariation === 'string') {
      try {
        parsedProductVariations = JSON.parse(data.productVariation);
        if (!Array.isArray(parsedProductVariations)) {
            throw new Error("Variations data must be an array.");
        }
      } catch (e) {
        console.error("Error parsing product variations JSON:", e);
        throw new Error("ভুল ভ্যারিয়েশন তথ্য ফরম্যাট। (Invalid variation data format.)");
      }
    } else if (Array.isArray(data.productVariation)) {
        // If it's already an array (e.g. passed programmatically if not from FormData)
        parsedProductVariations = data.productVariation;
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
      const newProductCode = (productCodeCounter.lastProductCode + 1).toString();
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
      const { gallery, productVariation, ...filteredData } = data;

      // --- Robust Number Parsing Helper ---
      const parseOptionalNumber = (value, defaultValue = null) => {
        if (value === undefined || value === null || String(value).trim() === "") {
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
        isActive: Boolean(data?.isActive === 'on' || data?.isActive === true || data?.isActive === 'true'),
        isFeatured: Boolean(data?.isFeatured === 'on' || data?.isFeatured === true || data?.isFeatured === 'true'),
        slug: slug,
        category: data?.category
          ? { connect: { id: data.category } }
          : undefined,
        thumbnail: { connect: { id: data.thumbnail } },
        regularPrice: mainProductRegularPrice,
        discountPrice: parseOptionalNumber(data.discountPrice),
        stockQuantity: parsedProductVariations.length > 0 ? 0 : parseOptionalNumber(data.stockQuantity, 0),
        insideDhaka: parseOptionalNumber(data.insideDhaka),
        outSideDhaka: parseOptionalNumber(data.outSideDhaka),
        weight: parseOptionalNumber(data.weight),
        hasVariations: parsedProductVariations.length > 0,
        description: data?.description || null,
        seoKeyWord: data?.seoKeyWord || null,
        seoDescription: data?.seoDescription || null,
        // Ensure other fields from Product schema are handled
        mainImage: data?.mainImage || null, // Example if you have this field
        imageGallery: data?.imageGallery ? data.imageGallery.split(",").map(s => s.trim()).filter(s => s) : [], // Example
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
          if (!variantData.matcherId || !Array.isArray(variantData.combination) || variantData.combination.length === 0) {
            console.warn("Skipping incomplete variant data (missing matcherId or combination array):", variantData);
            continue;
          }

          // SKU for this specific variant instance
          const variantSku = variantData.sku || `${product.productCode}-${variantData.matcherId}`;
          // Stock, price, weight for this specific variant instance
          const variantStock = parseOptionalNumber(variantData.qty, 0); // Default to 0 stock
          const variantPrice = parseOptionalNumber(variantData.price, product.regularPrice); // Default to main product price
          const variantWeight = parseOptionalNumber(variantData.weight, product.weight); // Default to main product weight
          const variantThumbnailId = variantData.image || product.thumbnailId; // Default to main product thumbnail

          for (const attrPair of variantData.combination) {
            if (!attrPair.variation?.id || !attrPair.value?.id) {
              console.warn("Skipping variation attribute pair with missing IDs:", attrPair, "for matcherId:", variantData.matcherId);
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
        } else if (parsedProductVariations.length > 0 && productVariationsToCreate.length === 0) {
          // This implies all parsedProductVariations items were malformed
          throw new Error("সমস্ত ভ্যারিয়েশন তথ্য অসম্পূর্ণ বা ভুল ছিল। (All provided variation data was incomplete or incorrect.)");
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
    console.error("Error creating product:", error);
    return { success: false, message: error.message || "প্রোডাক্ট তৈরি করতে একটি ত্রুটি ঘটেছে।" };
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
    // Calculate the offset based on the page and limit
    const offset = (page - 1) * limit;

    // Fetch paginated data
    const data = await prisma.product.findMany({
      skip: offset, // Skip the previous pages
      take: limit, // Limit the number of items per page
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
        variations:{
          include:{
            thumbnail: true,
            variationName:true,
            variaionValue:true

          }
        }
      },
    });
    console.log("Fetched products:", data);
    // Transform the gallery field to extract only media details
    const transformedData = data.map((product) => ({
      ...product,
      gallery: product.gallery.map((g) => g.media), // Extract only media details
    }));

    // Get the total count of products for pagination metadata
    const totalCount = await prisma.product.count();

    return {
      success: true,
      data: transformedData,
      meta: {
        totalCount, // Total number of products
        totalPages: Math.ceil(totalCount / limit), // Total number of pages
        currentPage: page, // Current page
        limit, // Items per page
      },
    };
  } catch (error) {
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
