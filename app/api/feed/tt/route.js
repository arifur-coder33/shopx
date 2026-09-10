import { getProductsForFeed } from "@/backend/lib/feed/getProductsForFeed";
import { socialFormatProducts } from "@/backend/lib/feed/socialFormatProducts";
import { getPublicSiteIdentity } from "@/backend/services/siteAppearanceService";

export async function GET(request) {
  const [products, identity] = await Promise.all([
    getProductsForFeed(),
    getPublicSiteIdentity(),
  ]);
  const items = socialFormatProducts(products, {
    siteUrl: new URL(request.url).origin,
    brand: identity.name,
  });

  const csvHeaders = [
    "sku_id",
    "item_group_id",
    "title",
    "description",
    "availability",
    "price",
    "sale_price",
    "link",
    "image_link",
    "additional_image_link",
    "brand",
    "google_product_category",
    "product_type",
    "color",
    "size",
    "gender",
    "age_group",
    "condition",
    "custom_label_0",
    "custom_label_1",
    "custom_label_2",
    "custom_label_3",
    "custom_label_4",
  ];

  const rows = items.map((p) => ({
    sku_id: p.id, // TikTok-এ id field হলো sku_id
    item_group_id: p.item_group_id,
    title: p.title,
    description: p.description,
    availability: p.availability === "in stock" ? "in stock" : "out of stock",
    price: `${p.price} BDT`,
    sale_price: p.sale_price ? `${p.sale_price} BDT` : "",
    link: p.link,
    image_link: p.image,
    additional_image_link: p.additional_image_link || "",
    brand: p.brand || "",
    google_product_category: p.google_product_category || "",
    product_type: p.product_type || "",
    color: p.color || "",
    size: p.size || "",
    gender: p.gender || "",
    age_group: p.age_group || "",
    condition: p.condition || "new",
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
      "Content-Disposition": "attachment; filename=tiktok_product_feed.csv",
    },
  });
}
