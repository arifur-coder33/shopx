import prisma from "@/lib/prisma";
import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
import { htmlToText } from "html-to-text";

export async function GET(req) {
  const products = await prisma.product.findMany({
    where: { isActive: true }, // Only include active products
  });
  const encodeCloudinaryUrl = (url) => {
    if (!url) return "";
    return url.replace(/,/g, "%2C");
  };
  const rows = products.map((product) => ({
    id: product.id,
    title: product.title.trim(),
    description: htmlToText(product.description || "").trim(),
    link: `${process.env.NEXT_PUBLIC_SITE_URL}product/${product.slug}`,
    image_link: cloudinaryMainImage(product.mainImage, 800, 800),
    additional_image_link:
      product.imageGallery
        ?.slice(0, 10)
        .map((url) => encodeCloudinaryUrl(cloudinaryMainImage(url, 800, 800))) // same transformation as main image
        .join(",") || "",
    price: `${Number(product.regularPrice).toFixed(2)} BDT`,
    sale_price: product.discountPrice
      ? `${Number(product.discountPrice).toFixed(2)} BDT`
      : "",
    availability: "in_stock",
    condition: "new",
    brand: "bdmart24", // or real brand
    mpn: product.productCode || product.id, // VERY important
    identifier_exists: "FALSE", // because no GTIN
    // gtin: leave out completely if no real GTIN

    // Apparel only – add these when relevant
    item_group_id: product?.hasVariations ? product.id : "", // same base product ID for variants
    color: product?.color || "",
    size: product?.size || "",
    gender: product?.gender || "unisex", // add field or default
    age_group: product?.age_group || "adult", // add field or default

    shipping: [
      `BD:Inside Dhaka::${product?.insideDhaka || 60} BDT`,
      `BD:Outside Dhaka::${product?.outSideDhaka || 120} BDT`,
    ].join("|"),

    // Optional but helpful
    shipping_weight: product.weight
      ? `${Number(product.weight).toFixed(2)} kg`
      : "1.00 kg",
    custom_label_0: product.isFeatured ? "featured" : "regular",
  }));

  const csvHeaders = [
    "id",
    "title",
    "description",
    "link",
    "image_link",
    "additional_image_link",
    "price",
    "sale_price",
    "availability",
    "condition",
    "brand",
    "mpn",
    "identifier_exists",
    "item_group_id",
    "color",
    "size",
    "gender",
    "age_group",
    "shipping",
    "shipping_weight",
    "custom_label_0",
  ];
  const csvContent = [csvHeaders.join(",")]
    .concat(
      rows.map((row) =>
        csvHeaders.map((header) => JSON.stringify(row[header] || "")).join(",")
      )
    )
    .join("\n");

  // Prepend BOM for proper encoding of Bengali text
  const utf8BOM = "\uFEFF";
  const csvWithBOM = utf8BOM + csvContent;

  // Create a Response object with the CSV content
  return new Response(csvWithBOM, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=google-merchant-feed.csv",
    },
  });
}
