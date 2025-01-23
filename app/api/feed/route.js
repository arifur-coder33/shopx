// `/app/api/feed/route.js`
import { prisma } from "@/lib/prisma"; // Your Prisma client path

export async function GET(req, res) {
  const products = await prisma.product.findMany({
    where: { isActive: true }, // Only include active products
  });

  const rows = products.map((product) => ({
    id: product.id,
    title: product.title,
    description: product.description || "",
    link: `${process?.env?.NEXT_PUBLIC_SITE_URL}/product/${product.slug}`,
    image_link: product.mainImage,
    availability:  "in_stock" ,
    price: `${product.regularPrice} BDT`,
    sale_price: product.discountPrice ? `${product.discountPrice} BDT` : "",
    brand: "BDMART24", // Replace with your brand name
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
    [csvHeaders.join(",")].concat(
      rows.map((row) =>
        csvHeaders.map((header) => JSON.stringify(row[header] || "")).join(",")
      )
    ).join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=google-merchant-feed.csv");
  res.status(200).send(csvContent);
}
