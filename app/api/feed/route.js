// import prisma from "@/lib/prisma";
// import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
// import { htmlToText } from "html-to-text";

// export async function GET(req) {
//   const products = await prisma.product.findMany({
//     where: { isActive: true }, // Only include active products
//   });

//   const rows = products.map((product) => ({
//     id: product.id,
//     title: product.title,
//     description: htmlToText(product.description) || "",
//     link: `${process?.env?.NEXT_PUBLIC_SITE_URL}product/${product.slug}`,
//     image_link: cloudinaryMainImage(product?.mainImage, 800, 800),
//     availability: "in_stock",
//     price: `${product.regularPrice} BDT`,
//     sale_price: product.discountPrice ? `${product.discountPrice} BDT` : "",
//     brand: "bdmart24", // Replace with your brand name
//     condition: "new", // All products marked as new
//     custom_label_0: product.isFeatured ? "featured" : "standard",
//     shipping_weight: product.weight ? `${product.weight} kg` : "1 kg",
//   }));

//   const csvHeaders = [
//     "id",
//     "title",
//     "description",
//     "link",
//     "image_link",
//     "availability",
//     "price",
//     "sale_price",
//     "brand",
//     "condition",
//     "custom_label_0",
//     "shipping_weight",
//   ];

//   const csvContent = [csvHeaders.join(",")]
//     .concat(
//       rows.map((row) =>
//         csvHeaders.map((header) => JSON.stringify(row[header] || "")).join(",")
//       )
//     )
//     .join("\n");

//   // Prepend BOM for proper encoding of Bengali text
//   const utf8BOM = "\uFEFF";
//   const csvWithBOM = utf8BOM + csvContent;

//   // Create a Response object with the CSV content
//   return new Response(csvWithBOM, {
//     headers: {
//       "Content-Type": "text/csv; charset=utf-8",
//       "Content-Disposition": "attachment; filename=google-merchant-feed.csv",
//     },
//   });
// }

import prisma from "@/lib/prisma";
import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
import { htmlToText } from "html-to-text";

export async function GET(req) {
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
    },
    include: {
      category: {
        select: {
          name: true, // Include only the category name
        },
      },
    },
  });

  const encodeUrl = (url) => (url ? url.replace(/,/g, "%2C") : "");

  const rows = products.map((p) => ({
    // === REQUIRED FIELDS (Meta বাধ্যতামূলক) ===
    id: `${p.id}`, // Max 100 chars, unique
    title: p.title.trim().slice(0, 200), // Max 200, recommended <65
    description: (htmlToText(p.description || "") || p.title)
      .trim()
      .slice(0, 9999),
    availability: "in stock",
    condition: "new",
    price: `${Number(p.regularPrice).toFixed(2)} BDT`,
    link: `${process.env.NEXT_PUBLIC_SITE_URL}product/${p.slug}`,
    image_link: cloudinaryMainImage(p.mainImage, 800, 800),
    brand: "bdmart24",
    video: p?.vedioLink || "",
    sale_price:
      p.discountPrice && p.discountPrice < p.regularPrice
        ? `${Number(p.discountPrice).toFixed(2)} BDT`
        : "",
    additional_image_links:
      p.imageGallery?.length > 0
        ? p.imageGallery
            .slice(0, 20)
            .map((url) => encodeUrl(cloudinaryMainImage(url, 800, 800)))
            .join(",")
        : "",
    mpn: p?.productCode || `bdm24-${p.id}`,
    size: p?.size || "",
    color: p.color || "",
    gender: p?.gender || "unisex",
    age_group: p?.age_group || "adult",

    shipping: [
      `BD:Inside Dhaka::${p?.insideDhaka || 60} BDT`,
      `BD:Outside Dhaka::${p?.outSideDhaka || 120} BDT`,
    ].join("|"),

    shipping_weight: p?.weight
      ? `${Number(p?.weight).toFixed(2)} kg`
      : "1.00 kg",

    custom_label_0: p?.isFeatured ? "Best Seller" : "Regular",
    custom_label_1: p?.category?.name || "General",
    custom_label_2: "Bangladesh",
    custom_label_3: new Date().toISOString().split("T")[0],

    item_group_id: p?.hasVariations ? `group-${p.id}` : "",

    fb_product_category: p?.fb_product_category || "",
    google_product_category: p?.google_product_category || "",
  }));

  // EXACT ORDER & NAMES Meta চায়
  const csvHeaders = [
    "id",
    "title",
    "description",
    "availability",
    "condition",
    "price",
    "link",
    "image_link",
    "brand",
    "video",
    "sale_price",
    "additional_image_links",
    "mpn",
    "size",
    "color",
    "gender",
    "age_group",
    "shipping",
    "shipping_weight",
    "custom_label_0",
    "custom_label_1",
    "custom_label_2",
    "custom_label_3",
    "item_group_id",
    "fb_product_category",
    "google_product_category",
  ];

  const csvContent = [
    csvHeaders.join(","),
    ...rows.map((row) =>
      csvHeaders.map((field) => JSON.stringify(row[field] ?? "")).join(",")
    ),
  ].join("\n");

  const BOM = "\uFEFF";
  return new Response(BOM + csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=facebook-catalog-feed.csv",
    },
  });
}
