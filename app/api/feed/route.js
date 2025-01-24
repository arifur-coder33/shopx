import prisma from "@/lib/prisma";
import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
import { htmlToText } from "html-to-text";


export async function GET(req) {
  const products = await prisma.product.findMany({
    where: { isActive: true }, // Only include active products
  });

    
  const rows = products.map((product) => ({
    id: product.id,
    title: product.title,
    description: htmlToText(product.description) || "",
    link: `${process?.env?.NEXT_PUBLIC_SITE_URL}/${product.slug}`,
    image_link: cloudinaryMainImage(product?.mainImage, 800, 800),
    availability: "in_stock",
    price: `${product.regularPrice} BDT`,
    sale_price: product.discountPrice ? `${product.discountPrice} BDT` : "",
    brand: "bdmart24", // Replace with your brand name
    condition: "new", // All products marked as new
    custom_label_0: product.isFeatured ? "featured" : "standard",
  }));

  const csvHeaders = [
    "id",
    "title",
    "description",
    "link",
    "image_link",
    "availability",
    "price",
    "sale_price",
    "brand",
    "condition",
    "custom_label_0",
  ];

  const csvContent =
    [csvHeaders.join(",")]
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
