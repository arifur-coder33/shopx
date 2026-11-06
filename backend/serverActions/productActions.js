"use server";

import prisma from "@/lib/prisma";
import { revalidateCatalogPages } from "@/backend/utils/revalidateStorefront";
import arraySum from "@/utils/arraySum";
import calculateInitialDisplayPrice from "@/utils/calculateInitialDisplayPrice";
import { getMinMax } from "@/utils/getMinMax";
import { revalidatePath, revalidateTag } from "next/cache";
import { cache } from "react";
import { buildCategoryPath } from "../utils/buildCategoryPath";
import { buildSearchText } from "../utils/buildSearchText";
import { generateSlug, generateUniqueSlug } from "../utils/generateSlug";
import { getDataSelectFields } from "../utils/getDataSelectFields";
import { getUserId, hasPermission } from "../utils/hasPermission";
import { findSearchProducts } from "../utils/findSearchProducts";
import { saveProductSpecifications } from "../services/specificationService";
import { buildStorefrontProductFilter } from "@/backend/utils/storefrontProductFilters";
import { getActiveCampaigns, getProductCardCampaignData } from "../services/campaignService";
import {
  normalizeProductVideos,
  parseProductVideosInput,
} from "../utils/productVideos";

export async function searchProductSuggestions(rawQuery) {
  const query = String(rawQuery || "").trim().slice(0, 120);
  if (!query) return { products: [], allProductIds: [] };
  const matches = await findSearchProducts(
    query,
    { id: true, title: true, slug: true, thumbnail: { select: { name: true } } },
    100,
  );
  return { products: matches.slice(0, 10), allProductIds: matches.map((product) => product.id) };
}

export async function getProductLiveStock(productId) {
  const id = String(productId || "");
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) return { success: false, message: "Invalid product." };
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        isActive: true,
        allowOutOfStockOrder: true,
        variations: { select: { id: true, stocks: { select: { available: true } } } },
      },
    });
    if (!product || product.isActive === false) return { success: false, message: "Product unavailable." };
    return {
      success: true,
      allowOutOfStockOrder: Boolean(product.allowOutOfStockOrder),
      variations: product.variations.map((variation) => ({
        id: variation.id,
        stock: variation.stocks.reduce((sum, row) => sum + Math.max(0, Number(row.available) || 0), 0),
      })),
    };
  } catch {
    return { success: false, message: "Could not check stock." };
  }
}

function parseProductFulfillmentSettings(data) {
  const advancePaymentType = ["DELIVERY_FEE", "PARTIAL"].includes(data.advancePaymentType) ? data.advancePaymentType : "NONE";
  const advancePaymentValueType = data.advancePaymentValueType === "PERCENT" ? "PERCENT" : "FIXED";
  const rawValue = String(data.advancePaymentValue ?? "").trim();
  const advancePaymentValue = rawValue ? Number(rawValue) : null;
  const deliveryMinDays = rawDays(data.deliveryMinDays, 2);
  const deliveryMaxDays = rawDays(data.deliveryMaxDays, 5);
  if (rawValue && (!Number.isFinite(advancePaymentValue) || advancePaymentValue < 0)) throw new Error("অগ্রিম পেমেন্টের পরিমাণ সঠিকভাবে দিন।");
  if (advancePaymentType === "PARTIAL" && (!(advancePaymentValue > 0) || (advancePaymentValueType === "PERCENT" && advancePaymentValue > 100))) throw new Error("Partial payment-এর জন্য ০-এর বেশি এবং percentage হলে ১০০-এর মধ্যে পরিমাণ দিন।");
  if (deliveryMinDays < 1 || deliveryMaxDays > 365 || deliveryMaxDays < deliveryMinDays) throw new Error("সর্বোচ্চ delivery দিন ৩৬৫-এর মধ্যে এবং ন্যূনতম দিনের সমান বা বেশি হতে হবে।");
  return { codAvailable: data.codAvailable === "true" || data.codAvailable === "on" || data.codAvailable === true, advancePaymentType, advancePaymentValueType, advancePaymentValue, deliveryMinDays, deliveryMaxDays };
}

function rawDays(value, fallback) {
  if (value == null || String(value).trim() === "") return fallback;
  const number = Number(value);
  return Number.isInteger(number) ? number : -1;
}

function parseProductReviewRows(formData) {
  const fields = ["productReviewId", "productReviewName", "productReviewMessage", "productReviewRating", "productReviewImage"];
  const values = Object.fromEntries(fields.map((field) => [field, formData.getAll(field).map((value) => String(value || "").trim())]));
  const length = Math.max(...fields.map((field) => values[field].length), 0);
  const rows = [];
  for (let index = 0; index < length; index += 1) {
    const row = {
      id: values.productReviewId[index] || null,
      customerName: values.productReviewName[index]?.slice(0, 120) || null,
      reviewText: values.productReviewMessage[index]?.slice(0, 1000) || null,
      imageId: values.productReviewImage[index] || null,
      rating: values.productReviewRating[index] ? Number(values.productReviewRating[index]) : null,
    };
    if (row.rating !== null && (!Number.isInteger(row.rating) || row.rating < 1 || row.rating > 5)) throw new Error("Product review rating must be from 1 to 5.");
    if (row.customerName || row.reviewText || row.imageId || row.rating !== null) rows.push(row);
  }
  return rows;
}

function parseProductQuestionsAnswers(data) {
  if (!data.productQuestionsAnswers) return [];
  let rows;
  try { rows = JSON.parse(data.productQuestionsAnswers); } catch { throw new Error("Product Q&A data is invalid."); }
  if (!Array.isArray(rows)) throw new Error("Product Q&A data must be a list.");
  return rows.map((row) => ({
    question: String(row?.question || "").trim().slice(0, 500),
    answer: String(row?.answer || "").trim().slice(0, 3000),
  })).filter((row) => row.question && row.answer);
}

function transformVariations(productVariations) {
  if (!productVariations || productVariations.length === 0) {
    return [];
  }

  // Map over each ProductVariation record. Each record is a unique variant.
  return productVariations.map((pv) => {
    const warehouseStock = (pv.stocks || []).reduce((sum, row) => sum + Math.max(0, Number(row.available) || 0), 0);
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
      stock: String(warehouseStock),
      qty: String(warehouseStock),
      image: pv.thumbnail
        ? { id: pv.thumbnail.id, name: pv.thumbnail.name }
        : null,
      imageUrl: pv.thumbnail?.name ? `/uploads/${pv.thumbnail.name}` : null,
      combination: combination,
      combinations: combinations,
      variationValues: variationValues,
      weight: pv.weight,
      dimensions: pv.dimensions,
    };
  });
}

export async function createProductActions(formData) {
  try {
    let data = Object.fromEntries(formData.entries());

    // --- Basic Validation ---
    if (!data?.title || !data?.regularPrice || !data?.thumbnail) {
      throw new Error(
        "সব ফিল্ড গুলতে তথ্য দিন। (Title, Regular Price, Thumbnail are required)",
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
          "ভুল ভ্যারিয়েশন তথ্য ফরম্যাট। (Invalid variation data format.)",
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
          data?.isFeatured === "on" || data?.isFeatured === true,
        ),
        allowOutOfStockOrder: Boolean(data?.allowOutOfStockOrder === "on" || data?.allowOutOfStockOrder === true),
        slug: slug,
        category: data?.category
          ? { connect: { id: data.category } }
          : undefined,
        thumbnail: { connect: { id: data.thumbnail } },
        regularPrice: mainProductRegularPrice,
        discountPrice: parseOptionalNumber(data.discountPrice),
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
              variantData,
            );
            continue; // Skip this variant and move to the next
          }

          // Prepare data for the single ProductVariation record
          const variantSku =
            variantData.sku ||
            `${product.productCode}-${variantData.matcherId}`;
          const variantRegularPrice = parseOptionalNumber(
            variantData.regularPrice,
            product.regularPrice,
          );

          const variantDiscountPrice = parseOptionalNumber(
            variantData.discountPrice,
            product.discountPrice || product.regularPrice,
          );
          const variantWeight = parseOptionalNumber(
            variantData.weight,
            product.weight,
          );
          // The `transformVariations` function puts image info in `image: {id, name}`
          const variantThumbnailId = variantData.image || product.thumbnailId;

          // Prepare the array of `Combination` data for the nested create
          const combinationsToCreate = variantData.combination
            .map((combo) => {
              if (!combo.variation?.id || !combo.value?.id) {
                console.warn(
                  "Skipping combination with missing variation or value ID:",
                  combo,
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
              variantData,
            );
            continue;
          }

          // Create the ProductVariation and its related Combinations in one go
          await tx.productVariation.create({
            data: {
              product: { connect: { id: product.id } }, // Link to the parent product
              matcherId: variantData.matcherId,
              sku: variantSku,
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
    revalidateTag("home-storefront");
    revalidateCatalogPages();
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
    await hasPermission("product", "create");
    const createdBy = await getUserId();
    let data = Object.fromEntries(formData.entries());
    const productReviewRows = parseProductReviewRows(formData);
    const productQuestionsAnswers = parseProductQuestionsAnswers(data);
    const fulfillmentSettings = parseProductFulfillmentSettings(data);

    // --- Basic Validation ---
    if (!data?.title || !data?.thumbnail) {
      throw new Error(
        "সব ফিল্ড গুলতে তথ্য দিন। (Title, Regular Price, Thumbnail are required)",
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
          "ভুল ভ্যারিয়েশন তথ্য ফরম্যাট। (Invalid variation data format.)",
        );
      }
    } else if (Array.isArray(data.variations)) {
      parsedProductVariations = data.variations;
    }
    const productVideos = parseProductVideosInput(data.videos, data.videoUrl);

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
        videos,
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
      const categoryPath = await buildCategoryPath(data.category, tx);
      const searchText = buildSearchText({
        title: data.title,
        description: data.description,
        categoryPath: categoryPath || "",
        seoKeyWord: data.seoKeyWord,
      });
      const preparedData = {
        productCode: newProductCode,
        title: data.title,
        slug: slug,
        description: data?.description || null,
        category: data?.category
          ? { connect: { id: data.category } }
          : undefined,
        canonicalUrl: data?.canonicalUrl || null,
        thumbnail: { connect: { id: data.thumbnail } },

        // This flag is key for your UI to know whether to show variation options
        hasVariations: parsedProductVariations.length > 0,
        google_Category_id: data?.google_Category_id || null,
        isActive: Boolean(data?.isActive === "on" || data?.isActive === true),
        isFeatured: Boolean(
          data?.isFeatured === "on" || data?.isFeatured === true,
        ),
        allowOutOfStockOrder: Boolean(data?.allowOutOfStockOrder === "on" || data?.allowOutOfStockOrder === true),

        ...fulfillmentSettings,

        // Keep the first URL in the legacy column while all titled videos live
        // in ProductVideo. This keeps older integrations backward-compatible.
        videoUrl: productVideos[0]?.url || null,
        gender: data?.gender || null,
        ageGroup: data?.ageGroup || null,

        seoKeyWord: data?.seoKeyWord || null,
        seoDescription: data?.seoDescription || null,
        searchText: searchText,
      };

      // 🔹 Create the product
      const product = await tx.product.create({
        data: preparedData,
      });

      if (productQuestionsAnswers.length) {
        await tx.productQuestionAnswer.createMany({
          data: productQuestionsAnswers.map((row, sortOrder) => ({ ...row, productId: product.id, sortOrder })),
        });
      }

      const reviewImageIds = [...new Set(productReviewRows.map((row) => row.imageId).filter(Boolean))];
      if (reviewImageIds.length) {
        const validImageCount = await tx.media.count({ where: { id: { in: reviewImageIds } } });
        if (validImageCount !== reviewImageIds.length) throw new Error("A selected product review photo could not be found in the media library.");
        await tx.photoReview.createMany({
          data: productReviewRows.map(({ id, ...row }) => ({ ...row, productId: product.id, createdBy })),
        });
      } else if (productReviewRows.length) {
        await tx.photoReview.createMany({ data: productReviewRows.map(({ id, ...row }) => ({ ...row, productId: product.id, createdBy })) });
      }

      if (productVideos.length) {
        await tx.productVideo.createMany({
          data: productVideos.map((video) => ({ ...video, productId: product.id })),
        });
      }

      await saveProductSpecifications(tx, product.id, product.categoryId, data.specifications);

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
              regularPrice: parseOptionalNumber(
                variantData.regularPrice,
                mainProductRegularPrice,
              ),
              discountPrice: parseOptionalNumber(
                variantData.discountPrice,
                parseOptionalNumber(data.discountPrice),
              ),
              weight: parseOptionalNumber(data.weight), // Base weight
              dimensions: data.dimensions || null, // Base dimensions
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
            weight: parseOptionalNumber(data.weight), // Base weight
            dimensions: data.dimensions || null, // Base dimensions
            // Use the main form data for price/stock
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
    }, { maxWait: 10000, timeout: 30000 });

    // --- Revalidation ---
    revalidatePath("/admin/product");
    revalidatePath("/");
    revalidatePath(`/product/${result.slug}`);
    revalidateTag("products");
    revalidateTag("home-storefront");
    revalidateCatalogPages();
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
export async function getProductById(id) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: id },
      include: {
        category: true,
        specifications: { orderBy: { sortOrder: "asc" }, include: { specification: { include: { parent: true } } } },
        thumbnail: {
          select: { id: true, name: true },
        },
        gallery: {
          include: {
            media: { select: { id: true, name: true } },
          },
        },
        videos: { orderBy: { sortOrder: "asc" } },
        photoReviews: {
          where: { orderItemId: null },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
          include: { image: { select: { id: true, name: true, displayName: true, width: true, height: true, sizeBytes: true } } },
        },
        questionsAnswers: { orderBy: { sortOrder: "asc" } },
        // [UPDATED] New include structure for variations
        variations: {
          include: {
            stocks: { select: { available: true } },
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

    // Transform gallery
    const transformedGallery = product?.gallery?.map((g) => ({
      id: g.media.id,
      name: g.media.name,
    }));

    // Use the new, simpler transformVariations function
    const transformedVariations = transformVariations(product.variations);
    const getDiscountPrice = getMinMax(
      product.variations.map((v) => v.discountPrice || v.regularPrice || 0),
    );
    const getDiscountPriceList =
      getDiscountPrice.min === getDiscountPrice.max
        ? getDiscountPrice.min
        : `${getDiscountPrice.min}-${getDiscountPrice.max}`;
    const transformedProducts = {
      ...product,
      discountPrice: getDiscountPriceList,

      thumbnail: product.thumbnail
        ? { id: product.thumbnail.id, name: product.thumbnail.name }
        : null,
      gallery: transformedGallery,
      videos: normalizeProductVideos(product.videos, product.videoUrl),
      variations: transformedVariations,
    };

    return { success: true, data: transformedProducts }; // Return success with product data
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
        videos: { orderBy: { sortOrder: "asc" } },
        // [UPDATED] New include structure for variations
        variations: {
          include: {
            stocks: { select: { available: true } },
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

// Keep static product generation lightweight: the build only needs active slugs,
// not every relation, image and variation returned by getProducts().
export const getActiveProductSlugs = async () => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: { slug: true },
    });

    return {
      success: true,
      data: products.filter((product) => product.slug),
    };
  } catch (error) {
    console.error("Error loading product slugs for static generation:", error);
    return { success: false, data: [], error: error.message };
  }
};

export async function getAllProduct(params) {
  try {
    const {
      limit,
      cursor,
      tableProperties,
      sortField = "createdAt",
      sortDirection = "desc",
      title,
      productCode, // New filter for productCode
      name,
      status,
      stock: stockStatus,
      sku, // For filtering by variation SKU
    } = params;

    const whereClause = {};

    if (title) {
      // Normalize the search query for better matching
      const normalizedSearch = title
        .toLowerCase()
        .replace(/[^\w\s]/g, "") // Remove special characters
        .replace(/\s+/g, " ") // Collapse multiple spaces
        .trim();

      // Split into individual search terms
      const searchTerms = normalizedSearch
        .split(" ")
        .filter((term) => term.length > 0);

      if (searchTerms.length > 0) {
        // Create regex patterns for each term for flexible matching
        const searchConditions = searchTerms.map((term) => ({
          OR: [
            {
              title: {
                contains: term,
                mode: "insensitive",
              },
            },
            {
              slug: {
                contains: term,
                mode: "insensitive",
              },
            },
            // Additional fuzzy matching with regex for better results
          ],
        }));

        // Use AND to ensure all search terms are matched
        whereClause.AND = searchConditions;
      }
    }

    if (productCode)
      whereClause.productCode = { contains: productCode, mode: "insensitive" };
    if (status && status !== "ALL") whereClause.status = status; // Handle "ALL" explicitly

    // Filtering by SKU within variations
    if (sku) {
      whereClause.variations = {};
    }

    if (name) {
      whereClause.category = {
        name: { contains: name, mode: "insensitive" },
      };
    }

    if (stockStatus) {
      if (!whereClause.variations) {
        whereClause.variations = {};
      }

      if (stockStatus === "IN STOCK") {
        whereClause.variations.some = {
          stocks: { some: { available: { gt: 0 } } },
        };
      } else if (stockStatus == "OUT STOCK") {
        whereClause.variations.none = {
          stocks: { some: { available: { gt: 0 } } },
        };
      } else if (stockStatus == "LESS STOCK") {
        whereClause.variations.some = {
          stocks: { some: { available: { gt: 0, lte: 5 } } },
        };
      }
    }
    const selectFields = getDataSelectFields(tableProperties);

    const { price, stock, ...restSelectFields } = selectFields;

    const requestedLimit = Number(limit);
    const products = await prisma.product.findMany({
      // *** FIX: Querying Product model ***
      take: requestedLimit + 1,
      where: whereClause,
      select: {
        ...restSelectFields,
        // Include variations to calculate minPrice if it's not already in selectFields
        variations: {
          select: {
            id: true,
            thumbnail: { select: { id: true, name: true } },
            discountPrice: true,
            regularPrice: true,
            stocks: { select: { available: true } },
            sku: true,
            combinations: {
              select: {
                variationName: { select: { id: true, name: true } },
                variationValue: { select: { id: true, value: true } },
              },
            },
            orders: {
              select: {
                quantity: true,
              },
            },
          },
        },
        // Include thumbnail relation for the main product image

        // Include category relation to display category name
      },
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { [sortField]: sortDirection },
    });

    const reviewRows = products.length
      ? await prisma.photoReview.groupBy({
          by: ["productId"],
          where: {
            productId: { in: products.map((product) => product.id) },
            isPublished: true,
          },
          _count: { _all: true },
          _avg: { rating: true },
        })
      : [];
    const reviewsByProductId = new Map(
      reviewRows.map((row) => [row.productId, {
        reviewCount: row._count._all,
        reviewRating: row._avg.rating || 0,
      }]),
    );

    let nextCursor = null;
    if (products.length > requestedLimit) {
      products.pop();
      nextCursor = products[products.length - 1].id;
    }

    const processedProducts = products.map((product) => {
      const { priceToDisplay, originalPriceToDisplay } =
        calculateInitialDisplayPrice(product.variations);
      const stock = arraySum(product.variations.map((v) => v.stocks.reduce((sum, row) => sum + Math.max(0, Number(row.available) || 0), 0)));
      const orderQty = arraySum(
        product.orders
          .filter((v) => v.status !== "CANCELED" && v.status !== "RETURNED")
          .map((v) => Number(v.quantity) || 0),
      );

      const { variations, ...rest } = product;
      const updatedVariations = variations.map((item) => {
        const totalOrders = item.orders.reduce(
          (sum, item) => sum + item.quantity,
          0,
        );
        return {
          ...item,
          stock: item.stocks.reduce((sum, row) => sum + Math.max(0, Number(row.available) || 0), 0),
          orders: totalOrders,
          price: item.discountPrice || item.regularPrice,
        };
      });
      return {
        variations: updatedVariations,
        ...rest,
        ...(reviewsByProductId.get(product.id) || { reviewCount: 0, reviewRating: 0 }),
        price: priceToDisplay || "N/A", // Format price
        stock: stock, // Total stock from variations
        orders: orderQty || 0, // Total orders from variations
      };
    });

    return {
      success: true,
      data: processedProducts,
      nextCursor: nextCursor,
    };
  } catch (error) {
    console.error("Failed to get products:", error);
    return { success: false, error: error.message };
  }
}
export async function getProductCount(params) {
  try {
    const {
      orderNo,
      sku,
      phoneNumber,
      status,
      startDate,
      endDate,
      title,
      name,
      stock: stockStatus,
    } = params;

    const whereClause = {};

    if (status) whereClause.status = status;
    if (name) {
      whereClause.category = {};
    }
    if (sku) {
      whereClause.variations = {
        some: { sku: { contains: sku, mode: "insensitive" } },
      };
    }

    if (name) {
      whereClause.category = {
        name: { contains: name, mode: "insensitive" },
      };
    }

    if (title) {
      // Step 1: Normalize the search input
      // This converts "I phone" or "I-Phone" into "iphone" for consistent matching.
      const normalizedSearchInput = title.replace(/[\s-]/g, "").toLowerCase();

      // Step 2: Split the original title by spaces and hyphens to get individual words.
      // This is for matching "i" and "phone" separately if the full normalized string doesn't match.
      const individualTerms = title
        .toLowerCase()
        .split(/[\s-]+/)
        .filter((term) => term.length > 0);

      // Construct an OR clause to find products matching any of these conditions:
      const titleOrConditions = [];

      // Option A: Match the product title against the normalized search input.
      // This will catch "iPhone" when searching "i phone", "i-phone", or "iphone".
      titleOrConditions.push({
        title: {
          contains: normalizedSearchInput,
          mode: "insensitive",
        },
      });

      // Option B: If the search input had multiple individual terms,
      // create an AND condition for each term to be present in the title.
      // This is useful for "Apple watch" matching a title like "Apple Series 7 Watch".
      if (individualTerms.length > 1) {
        titleOrConditions.push({
          AND: individualTerms.map((term) => ({
            title: {
              contains: term,
              mode: "insensitive",
            },
          })),
        });
      } else if (
        individualTerms.length === 1 &&
        individualTerms[0] !== normalizedSearchInput
      ) {
        // If there's only one term and it's different from the normalized input
        // (e.g., searching "i" for "iPhone"), explicitly add a contains for the single term.
        // This handles cases where the user might just type a part of a word.
        titleOrConditions.push({
          title: {
            contains: individualTerms[0],
            mode: "insensitive",
          },
        });
      }

      // Assign the built OR conditions to the whereClause.title, or if it needs to be top-level
      whereClause.OR = titleOrConditions;
    }

    if (stockStatus) {
      if (!whereClause.variations) {
        whereClause.variations = {};
      }

      if (stockStatus === "IN STOCK") {
        whereClause.variations.some = {
          stocks: { some: { available: { gt: 0 } } },
        };
      } else if (stockStatus == "OUT STOCK") {
        whereClause.variations.none = {
          stocks: { some: { available: { gt: 0 } } },
        };
      } else if (stockStatus == "LESS STOCK") {
        whereClause.variations.some = {
          stocks: { some: { available: { gt: 0, lte: 5 } } },
        };
      }
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
            stocks: { select: { available: true } },
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
        product.variations.map((v) => v.discountPrice || v.regularPrice || 0),
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

const getProductBySlugCached = cache(async (slug) => {
  // const headersList = headers();

  // const cookieHeader =
  //   headersList["cookie"] || headersList.get?.("cookie") || "no cookie header";
  // const session = await auth();

  try {
    const data = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: {
          select: {
            name: true,
            slug: true,
            fullPath: true,
          },
        },
        questionsAnswers: { orderBy: { sortOrder: "asc" } },
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
        videos: { orderBy: { sortOrder: "asc" } },
        variations: {
          include: {
            stocks: { select: { available: true } },
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
      videos: normalizeProductVideos(data.videos, data.videoUrl),
      variations: data.variations.map((variation) => ({ ...variation, stock: variation.stocks.reduce((sum, row) => sum + Math.max(0, Number(row.available) || 0), 0) })),
    };

    return { success: true, data: transformedData }; // Return success with product data
  } catch (error) {
    return { success: false, error: error.message }; // Return structured error
  }
});

export const getProductBySlug = async (slug) =>
  getProductBySlugCached(slug);
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
    console.log("udate data", data);

    return null;
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
    const productVideos = parseProductVideosInput(data.videos, data.videoUrl);

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
        videoUrl: productVideos[0]?.url || null,
        description: data.description || null,
        categoryId: data.category || null,
        canonicalUrl: data.canonicalUrl || null,
        google_Category_id: data.google_Category_id || null,
        thumbnailId: data.thumbnail || existingProduct.thumbnailId,
        regularPrice: hasSubmittedVariations
          ? null
          : parseOptionalNumber(data.regularPrice),
        discountPrice: hasSubmittedVariations
          ? null
          : parseOptionalNumber(data.discountPrice),

        seoKeyWord: data.seoKeyWord || null,
        seoDescription: data.seoDescription || null,
        isFeatured: Boolean(data.isFeatured === "on"),
        isActive: Boolean(data.isActive === "on"),
        allowOutOfStockOrder: Boolean(data.allowOutOfStockOrder === "on"),
        insideDhaka: parseOptionalNumber(data.insideDhaka),
        outSideDhaka: parseOptionalNumber(data.outSideDhaka),
        hasVariations: hasSubmittedVariations,
      };

      // Step 4: Update the Main Product Record
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: productUpdateData,
      });

      await tx.productVideo.deleteMany({ where: { productId: updatedProduct.id } });
      if (productVideos.length) {
        await tx.productVideo.createMany({
          data: productVideos.map((video) => ({
            ...video,
            productId: updatedProduct.id,
          })),
        });
      }

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

          const variantRegularPrice = parseOptionalNumber(
            variantData.regularPrice,
            parseOptionalNumber(data.regularPrice),
          );
          const variantDiscountPrice = parseOptionalNumber(
            variantData.discountPrice,
            parseOptionalNumber(data.discountPrice) ||
              parseOptionalNumber(data.regularPrice),
          );
          const variantWeight = parseOptionalNumber(
            variantData.weight,
            updatedProduct.weight,
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
                : null,
            )
            .filter(Boolean);

          if (combinationsToCreate.length === 0) continue;

          await tx.productVariation.create({
            data: {
              productId: updatedProduct.id,
              matcherId: variantData.matcherId,
              sku: variantSku,
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
    revalidateTag("home-storefront");
    revalidateCatalogPages();
    revalidateTag(`product-${result.slug}`);

    return { success: true, data: result };
  } catch (error) {
    if (error) {
      console.error("Caught error in updateProductAction:", error);
    } else {
      console.error(
        "Caught a null error in updateProductAction. This usually indicates an invalid data shape was passed to Prisma.",
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

export async function updateProductActionOld({ id: productId, formData }) {
  if (!productId) {
    return { success: false, message: "Product ID is required for update." };
  }

  try {
    const data = Object.fromEntries(formData.entries());

    // --- Basic Validation ---
    if (!data?.title || !data?.thumbnail) {
      throw new Error(
        "সব ফিল্ড গুলতে তথ্য দিন। (Title, Regular Price, Thumbnail are required)",
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
        allowOutOfStockOrder: Boolean(data.allowOutOfStockOrder === "on"),
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
                : null,
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
              regularPrice: parseOptionalNumber(
                variantData.regularPrice,
                mainProductRegularPrice,
              ),
              discountPrice: parseOptionalNumber(
                variantData.discountPrice,
                parseOptionalNumber(data.discountPrice),
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
    revalidateTag("home-storefront");
    revalidateCatalogPages();
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
export async function updateProductAction({ id: productId, formData }) {
  await hasPermission("product", "update");
  if (!productId) {
    return { success: false, message: "Product ID is required for update." };
  }

  const variationDeletionErrors = []; // Declared outside transaction for catch block access

  try {
    const data = Object.fromEntries(formData.entries());
    const productReviewRows = parseProductReviewRows(formData);
    const productQuestionsAnswers = parseProductQuestionsAnswers(data);
    const updatedBy = await getUserId();
    const fulfillmentSettings = parseProductFulfillmentSettings(data);
    console.log("update data", data);

    if (!data?.title || !data?.thumbnail) {
      throw new Error(
        "সব ফিল্ড গুলতে তথ্য দিন। (Title, Thumbnail are required)",
      );
    }

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
    const productVideos = parseProductVideosInput(data.videos, data.videoUrl);

    const parseOptionalNumber = (value, defaultValue = null) => {
      if (value === undefined || value === null || String(value).trim() === "")
        return defaultValue;
      const num = Number(value);
      return isNaN(num) ? defaultValue : num;
    };

    const result = await prisma.$transaction(async (tx) => {
      const existingProduct = await tx.product.findUnique({
        where: { id: productId },
      });
      if (!existingProduct) throw new Error("Product not found for update.");

      let newSlug = existingProduct.slug;
      if (data.title && data.title !== existingProduct.title) {
        const baseSlug = await generateSlug(data.slug || data.title);
        newSlug = await generateUniqueSlug(tx, baseSlug, productId);
      }
      const categoryPath = await buildCategoryPath(data.category, tx);

      const searchText = await buildSearchText({
        title: data.title,
        description: data.description,
        categoryPath: categoryPath || "",
        seoKeyWord: data.seoKeyWord,
      });
      console.log("Generated searchText for product:", searchText);

      const productUpdateData = {
        title: data.title,
        slug: newSlug,
        description: data.description || null,
        category: data?.category
          ? { connect: { id: data.category } }
          : existingProduct.categoryId,
        canonicalUrl: data.canonicalUrl || null,
        thumbnail: data.thumbnail
          ? { connect: { id: data?.thumbnail } }
          : existingProduct.thumbnailId,
        videoUrl: productVideos[0]?.url || null,
        seoKeyWord: data.seoKeyWord || null,
        seoDescription: data.seoDescription || null,

        isFeatured: Boolean(data.isFeatured === "on"),
        isActive: Boolean(data.isActive === "on"),
        allowOutOfStockOrder: Boolean(data.allowOutOfStockOrder === "on"),
        ...fulfillmentSettings,
        hasVariations: hasSubmittedVariations,
        google_Category_id: data.google_Category_id || null,
        searchText: searchText,
      };

      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: productUpdateData,
      });

      await tx.productQuestionAnswer.deleteMany({ where: { productId: updatedProduct.id } });
      if (productQuestionsAnswers.length) {
        await tx.productQuestionAnswer.createMany({
          data: productQuestionsAnswers.map((row, sortOrder) => ({ ...row, productId: updatedProduct.id, sortOrder })),
        });
      }

      const reviewImageIds = [...new Set(productReviewRows.map((row) => row.imageId).filter(Boolean))];
      const validImageCount = reviewImageIds.length
        ? await tx.media.count({ where: { id: { in: reviewImageIds } } })
        : 0;
      if (validImageCount !== reviewImageIds.length) throw new Error("A selected product review photo could not be found in the media library.");
      const currentPhotoReviews = await tx.photoReview.findMany({ where: { productId: updatedProduct.id, orderItemId: null }, select: { id: true } });
      const currentReviewIds = new Set(currentPhotoReviews.map((review) => review.id));
      const submittedExistingIds = new Set(productReviewRows.map((row) => row.id).filter(Boolean));
      if ([...submittedExistingIds].some((reviewId) => !currentReviewIds.has(reviewId))) throw new Error("One of the product reviews no longer exists. Refresh and try again.");
      await tx.photoReview.deleteMany({ where: { productId: updatedProduct.id, orderItemId: null, ...(submittedExistingIds.size ? { id: { notIn: [...submittedExistingIds] } } : {}) } });
      for (const row of productReviewRows) {
        const { id, ...reviewData } = row;
        if (id) {
          await tx.photoReview.update({ where: { id }, data: reviewData });
        } else {
          await tx.photoReview.create({ data: { ...reviewData, productId: updatedProduct.id, createdBy: updatedBy } });
        }
      }

      await saveProductSpecifications(tx, updatedProduct.id, updatedProduct.categoryId, data.specifications);

      await tx.productVideo.deleteMany({
        where: { productId: updatedProduct.id },
      });
      if (productVideos.length) {
        await tx.productVideo.createMany({
          data: productVideos.map((video) => ({
            ...video,
            productId: updatedProduct.id,
          })),
        });
      }

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

      const existingVariations = await tx.productVariation.findMany({
        where: { productId: updatedProduct.id },
        include: { combinations: true },
      });

      const existingVariationMap = new Map(
        existingVariations.map((v) => [v.matcherId, v]),
      );

      if (hasSubmittedVariations) {
        for (const variantData of submittedVariationsData) {
          if (
            !variantData.matcherId ||
            !Array.isArray(variantData.combination) ||
            variantData.combination.length === 0
          ) {
            console.warn(
              "Skipping invalid submitted variation data due to missing matcherId or combinations:",
              variantData,
            );
            continue;
          }
          const dimensions = variantData.dimensions;

          const variantSku =
            variantData.sku ||
            `${updatedProduct.productCode}-${variantData.matcherId}`;
          const variantRegularPrice = parseOptionalNumber(
            variantData.regularPrice,
          );
          const variantDiscountPrice = parseOptionalNumber(
            variantData.discountPrice,
          );
          const variantWeight = parseOptionalNumber(
            variantData.weight,
            updatedProduct.weight,
          );

          let variantThumbnailId = updatedProduct.thumbnailId;
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
          }

          const combinationsToProcess = variantData.combination
            .map((combo) =>
              combo.variation?.id && combo.value?.id
                ? {
                    variationNameId: combo.variation.id,
                    variationValueId: combo.value.id,
                  }
                : null,
            )
            .filter(Boolean);

          if (combinationsToProcess.length === 0) {
            console.warn(
              "Skipping variation due to no valid combinations to create/update:",
              variantData,
            );
            continue;
          }

          const existingVariant = existingVariationMap.get(
            variantData.matcherId,
          );
          console.log("variant dtaa", variantData);
          if (existingVariant) {
            await tx.productVariation.update({
              where: { id: existingVariant.id },
              data: {
                sku: variantSku,
                regularPrice: variantRegularPrice,
                discountPrice: variantDiscountPrice,
                weight: variantWeight,
                dimensions: dimensions,
                thumbnailId: variantThumbnailId,
                combinations: {
                  deleteMany: { productVariationId: existingVariant.id }, // Target specific combinations for deletion
                  create: combinationsToProcess,
                },
              },
            });
            existingVariationMap.delete(variantData.matcherId);
          } else {
            await tx.productVariation.create({
              data: {
                productId: updatedProduct.id,
                matcherId: variantData.matcherId,
                sku: variantSku,
                regularPrice: variantRegularPrice,
                discountPrice: variantDiscountPrice,
                weight: variantWeight,
                dimensions: dimensions,
                thumbnailId: variantThumbnailId,
                combinations: { create: combinationsToProcess },
              },
            });
          }
        }

        for (const [matcherId, variantToDelete] of existingVariationMap) {
          const ordersCount = await tx.orderItem.count({
            where: { variationId: variantToDelete.id },
          });

          if (ordersCount > 0) {
            // Add to the errors array, but do not throw, as product update is otherwise successful
            variationDeletionErrors.push(
              `Cannot delete variation with SKU "${variantToDelete.sku}" because it has ${ordersCount} associated order(s).`,
            );
            console.log(
              `Cannot delete variation with SKU "${variantToDelete.sku}" because it has ${ordersCount} associated order(s)`,
            );
          } else {
            // Delete associated combinations first
            await tx.productVariationCombination.deleteMany({
              where: { productVariationId: variantToDelete.id },
            });
            await tx.productVariation.delete({
              where: { id: variantToDelete.id },
            });
          }
        }
      } else {
        // LOGIC FOR SIMPLE PRODUCTS
        const defaultVariation = existingVariations.find(
          (v) => v.combinations.length === 0,
        );

        const defaultSku = updatedProduct.productCode;
        const defaultWeight = parseOptionalNumber(data.weight, 0);
        const defaultDimentions = data.dimensions;
        const defaultRegularPrice = parseOptionalNumber(data.regularPrice);
        const defaultDiscountPrice = parseOptionalNumber(data.discountPrice);

        if (defaultRegularPrice === null) {
          throw new Error("Simple product must have a Regular Price.");
        }

        if (defaultVariation) {
          await tx.productVariation.update({
            where: { id: defaultVariation.id },
            data: {
              sku: defaultSku,
              regularPrice: defaultRegularPrice,
              discountPrice: defaultDiscountPrice,
              thumbnailId: updatedProduct.thumbnailId,
              weight: defaultWeight,
              dimensions: defaultDimentions,
              combinations: {
                deleteMany: { productVariationId: defaultVariation.id },
              }, // Ensure no combinations
            },
          });
          existingVariationMap.delete(defaultVariation.matcherId);
        } else {
          await tx.productVariation.create({
            data: {
              productId: updatedProduct.id,
              matcherId: defaultSku,
              sku: defaultSku,
              weight: defaultWeight,
              dimensions: defaultDimentions,
              regularPrice: defaultRegularPrice,
              discountPrice: defaultDiscountPrice,
              thumbnailId: updatedProduct.thumbnailId,
              combinations: { create: [] },
            },
          });
        }

        for (const [matcherId, variantToDelete] of existingVariationMap) {
          if (defaultVariation && variantToDelete.id === defaultVariation.id) {
            continue;
          }

          const ordersCount = await tx.orderItem.count({
            where: { variationId: variantToDelete.id },
          });

          if (ordersCount > 0) {
            variationDeletionErrors.push(
              `Cannot delete variation with SKU "${variantToDelete.sku}" because it has ${ordersCount} associated order(s).`,
            );
          } else {
            await tx.productVariationCombination.deleteMany({
              where: { productVariationId: variantToDelete.id },
            });
            await tx.productVariation.delete({
              where: { id: variantToDelete.id },
            });
          }
        }
      }

      console.log("Updated product with variations:", updatedProduct);
      return updatedProduct; // This 'result' is the updated product
    }, { maxWait: 10000, timeout: 30000 });

    revalidatePath("/admin/products");
    revalidatePath("/");
    revalidatePath(`/product/${result.slug}`);
    revalidateTag("products");
    revalidateTag("home-storefront");
    revalidateCatalogPages();
    revalidateTag(`product-${result.slug}`);

    let successMessage = "Product updated successfully.";
    let warnMsg;
    console.log("PvariationDeletionErrors:", variationDeletionErrors.length);
    if (variationDeletionErrors.length > 0) {
      warnMsg =
        "Product updated successfully. However, some variations could not be deleted due to existing orders: " +
        variationDeletionErrors.join("; ");

      console.log(
        (successMessage +=
          " However, some variations could not be deleted due to existing orders: " +
          variationDeletionErrors.join("; ")),
      );
    }

    return { success: true, data: result, message: successMessage, warnMsg };
  } catch (error) {
    console.error("Error updating product:", error);
    let errorMessage = "An unknown error occurred while updating the product.";
    if (error instanceof Error) errorMessage = error.message;
    if (error?.code === "P2002" && error.meta?.target?.includes("slug")) {
      errorMessage = `Slug "${data.slug}" is already in use. Please choose another.`;
    }
    // Append variation deletion errors as additional context to the main error message
    if (variationDeletionErrors.length > 0) {
      errorMessage +=
        "\n(Also, some variation deletion issues were noted: " +
        variationDeletionErrors.join("; ") +
        ")";
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
    revalidateTag("home-storefront");
    revalidateCatalogPages();

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
    revalidateTag("home-storefront");
    revalidateCatalogPages();
    revalidateTag(`product-${data.slug}`);

    return { success: true, data };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const searchProducts = async (rawQuery, rawFilters = {}, cursor = null) => {
  const { filters, productWhere, variationWhere } = buildStorefrontProductFilter(rawFilters);
  const productIds = Array.isArray(rawFilters.productIds) ? rawFilters.productIds.filter((id) => typeof id === "string").slice(0, 100) : [];
  const pageSize = 24;
  const select = {
    id: true,
    title: true,
    slug: true,
    categoryId: true,
    hasVariations: true,
    createdAt: true,
    thumbnail: { select: { name: true } },
    variations: {
      ...(variationWhere && { where: variationWhere }),
      select: { regularPrice: true, discountPrice: true },
    },
    category: { select: { name: true, slug: true } },
  };
  const [products, campaigns] = await Promise.all([
    productIds.length
      ? prisma.product.findMany({
          where: { id: { in: productIds.slice(cursor ? Math.max(0, productIds.indexOf(cursor) + 1) : 0, (cursor ? Math.max(0, productIds.indexOf(cursor) + 1) : 0) + pageSize + 1) }, isActive: true, ...productWhere },
          select,
        }).then((rows) => {
          const byId = new Map(rows.map((product) => [product.id, product]));
          const offset = cursor ? Math.max(0, productIds.indexOf(cursor) + 1) : 0;
          return productIds.slice(offset, offset + pageSize + 1).map((id) => byId.get(id)).filter(Boolean);
        })
      : findSearchProducts(rawQuery, select, pageSize + 1, productWhere, cursor),
    getActiveCampaigns(),
  ]);

  const hasMore = products.length > pageSize;
  const visibleProducts = hasMore ? products.slice(0, pageSize) : products;
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
    const productVariations = product.variations || [];
    const regularPrices = productVariations.map((variation) => Number(variation.regularPrice)).filter(Number.isFinite);
    const displayPrices = productVariations
      .map((variation) => Number(variation.discountPrice ?? variation.regularPrice))
      .filter(Number.isFinite);
    const regularPrice = regularPrices.length ? Math.min(...regularPrices) : 0;
    let discountPrice = displayPrices.length ? Math.min(...displayPrices) : 0;
    if (discountPrice >= regularPrice) discountPrice = 0;

    return {
      id: product.id,
      title: product.title,
      slug: product.slug,
      regularPrice,
      discountPrice,
      hasVariations: product.hasVariations,
      ...(reviewsByProductId.get(product.id) || { reviewCount: 0, reviewRating: 0 }),
      thumbnail: { name: product.thumbnail?.name || null },
      category: product.category?.name || "Uncategorized",
      ...getProductCardCampaignData({
        campaigns,
        productId: product.id,
        categoryId: product.categoryId,
        regularPrice,
        discountPrice,
      }),
    };
  });

  return {
    success: true,
    data: filteredProducts,
    nextCursor: hasMore ? visibleProducts.at(-1)?.id || null : null,
    filters,
  };
};
