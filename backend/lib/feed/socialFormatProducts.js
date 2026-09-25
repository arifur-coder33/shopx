// /lib/feed/formatProducts.js

import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
import { htmlToTextCustome } from "@/utils/normalize";

const GOOGLE_CATEGORY =
  "Apparel & Accessories > Clothing > Outerwear > Coats & Jackets";

// ── Variation থেকে color ও size বের করো ──────────────────────
function extractAttributes(combinations) {
  let color = "";
  let size = "";
  let material = "";
  const others = [];

  for (const c of combinations) {
    const name = c.variationName?.name?.toLowerCase().trim();
    const value = c.variationValue?.value?.trim() || "";

    if (!value) continue;

    if (["color", "colour", "রং", "রঙ"].includes(name)) {
      color = value;
    } else if (["size", "সাইজ"].includes(name)) {
      size = value;
    } else if (["material", "ম্যাটেরিয়াল"].includes(name)) {
      material = value;
    } else {
      others.push(`${c.variationName?.name}:${value}`);
    }
  }

  const attributeLabel = [
    color && `Color:${color}`,
    size && `Size:${size}`,
    ...others,
  ]
    .filter(Boolean)
    .join(", ");

  return { color, size, material, attributeLabel };
}

// ── Custom Labels ─────────────────────────────────────────────
function getCustomLabels(product, variation) {
  const hasDiscount =
    variation.discountPrice && variation.discountPrice < variation.regularPrice;
  const isLowStock = (variation.stock || 0) > 0 && (variation.stock || 0) <= 5;

  return {
    custom_label_0: product.isFeatured ? "bestseller" : "regular",
    custom_label_1: hasDiscount ? "on-sale" : "full-price",
    custom_label_2: isLowStock ? "low-stock" : "normal-stock",
    custom_label_3:
      product.category?.name?.toLowerCase().replace(/\s+/g, "-") || "",
    custom_label_4: "",
  };
}

// ── Main Format Function ──────────────────────────────────────
export function socialFormatProducts(products, { siteUrl, brand } = {}) {
  const items = [];

  for (const product of products) {
    // Gallery images — additional_image_link-এর জন্য
    const galleryImages = (product.gallery || [])
      .map((g) => cloudinaryMainImage(g.media?.name, 800, 800))
      .filter(Boolean)
      .slice(0, 9); // Facebook max 10 images (1 main + 9 additional)

    for (const v of product.variations) {
      const { color, size, material, attributeLabel } = extractAttributes(
        v.combinations,
      );

      const image =
        cloudinaryMainImage(
          v.thumbnail?.name || product.thumbnail?.name,
          800,
          800,
        ) || "";

      // Additional images — variation image বাদে বাকিগুলো
      const additionalImages = galleryImages.filter((img) => img !== image);
      const regularPrice = v.regularPrice || 0;
      const discountPrice = v.discountPrice || null;
      const hasDiscount = discountPrice && discountPrice < regularPrice;

      const {
        custom_label_0,
        custom_label_1,
        custom_label_2,
        custom_label_3,
        custom_label_4,
      } = getCustomLabels(product, v);

      items.push({
        // ── Core ──────────────────────────────────────────────
        id: v.sku,
        item_group_id: product.productCode,
        title: attributeLabel
          ? `${product.title} (${attributeLabel})`
          : product.title,
        description: htmlToTextCustome(product.description) || "",

        // ── Price ─────────────────────────────────────────────
        price: regularPrice,
        sale_price: hasDiscount ? discountPrice : "",
        currency: "BDT",

        // ── Stock ─────────────────────────────────────────────
        availability: (v.stock || 0) > 0 ? "in stock" : "out of stock",

        // ── Images ────────────────────────────────────────────
        image,
        additional_image_link: additionalImages.join(","),

        // ── Links ─────────────────────────────────────────────
        link: new URL(
          `/product/${encodeURIComponent(product.slug)}?sku=${encodeURIComponent(v.sku)}`,
          `${siteUrl}/`,
        ).toString(),

        // ── Attributes ────────────────────────────────────────
        brand: brand || "",
        category: product.category?.name || "",
        google_product_category: product.google_Category_id || "",
        product_type:
          product.category?.fullPath || product.category?.name || "",
        color,
        size,
        material,
        gender: product?.gender || "unisex", // আপনার category অনুযায়ী dynamic করতে পারেন
        age_group: product?.ageGroup || "adult",
        condition: "new",

        // ── Custom Labels ─────────────────────────────────────
        custom_label_0,
        custom_label_1,
        custom_label_2,
        custom_label_3,
        custom_label_4,
      });
    }
  }

  return items;
}
