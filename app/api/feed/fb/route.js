// /app/api/feed/facebook/route.js

import { getProductsForFeed } from "@/backend/lib/feed/getProductsForFeed";
import { socialFormatProducts } from "@/backend/lib/feed/socialFormatProducts";

export async function GET() {
  const products = await getProductsForFeed();
  console.log("product feed", getProductsForFeed);
  const items = socialFormatProducts(products);

  const csvHeaders = [
    "id",
    "item_group_id",
    "title",
    "description",
    "availability",
    "price",
    "sale_price",
    "link",
    "image_link",
    "additional_image_link",
    "google_product_category",
    "product_type",
    "gender",
    "age_group",
    "condition",
    "brand",
    "color",
    "size",
    "material",
    "category",
    "custom_label_0",
    "custom_label_1",
    "custom_label_2",
    "custom_label_3",
    "custom_label_4",
  ];

  const rows = items.map((p) => ({
    id: p.id,
    item_group_id: p.item_group_id,
    title: p.title,
    description: p.description,
    availability: p.availability,
    price: `${p.price} BDT`,
    sale_price: p.sale_price ? `${p.sale_price} BDT` : "",
    link: p.link,
    image_link: p.image,
    additional_image_link: p.additional_image_link || "",
    google_product_category: p.google_product_category || "",
    product_type: p.product_type || "",
    gender: p.gender || "",
    age_group: p.age_group || "",
    condition: p.condition || "new",
    brand: p.brand || "",
    color: p.color || "",
    size: p.size || "",
    material: p.material || "",
    category: p.category || "",
    custom_label_0: p.custom_label_0 || "",
    custom_label_1: p.custom_label_1 || "",
    custom_label_2: p.custom_label_2 || "",
    custom_label_3: p.custom_label_3 || "",
    custom_label_4: p.custom_label_4 || "",
  }));

  const csvContent = [
    csvHeaders.join(","),
    ...rows.map((row) =>
      csvHeaders.map((header) => JSON.stringify(row[header] ?? "")).join(","),
    ),
  ].join("\n");

  const utf8BOM = "\uFEFF";

  return new Response(utf8BOM + csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=fb_product_feed.csv",
    },
  });
  //   return new Response(JSON.stringify(products), {
  //     status: 200,
  //     headers: { "Content-Type": "application/json" },
  //   });
}
