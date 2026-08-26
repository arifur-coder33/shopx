import { getProductsForFeed } from "@/backend/lib/feed/getProductsForFeed";
import { socialFormatProducts } from "@/backend/lib/feed/socialFormatProducts";

function escapeXml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const products = await getProductsForFeed();
  const items = socialFormatProducts(products);

  const xmlItems = items
    .map((p) => {
      const additionalImages = p.additional_image_link
        ? p.additional_image_link
            .split(",")
            .filter(Boolean)
            .map(
              (img) =>
                `<g:additional_image_link>${escapeXml(img.trim())}</g:additional_image_link>`,
            )
            .join("\n      ")
        : "";

      return `
    <item>
      <g:id>${escapeXml(p.id)}</g:id>
      <g:item_group_id>${escapeXml(p.item_group_id)}</g:item_group_id>
      <g:title>${escapeXml(p.title)}</g:title>
      <g:description>${escapeXml(p.description)}</g:description>
      <g:availability>${p.availability}</g:availability>
      <g:condition>${p.condition || "new"}</g:condition>
      <g:price>${p.price} BDT</g:price>
      ${p.sale_price ? `<g:sale_price>${p.sale_price} BDT</g:sale_price>` : ""}
      <g:link>${escapeXml(p.link)}</g:link>
      <g:image_link>${escapeXml(p.image)}</g:image_link>
      ${additionalImages}
      <g:brand>${escapeXml(p.brand)}</g:brand>
      ${p.google_product_category ? `<g:google_product_category>${escapeXml(p.google_product_category)}</g:google_product_category>` : ""}
      ${p.product_type ? `<g:product_type>${escapeXml(p.product_type)}</g:product_type>` : ""}
      ${p.color ? `<g:color>${escapeXml(p.color)}</g:color>` : ""}
      ${p.size ? `<g:size>${escapeXml(p.size)}</g:size>` : ""}
      ${p.material ? `<g:material>${escapeXml(p.material)}</g:material>` : ""}
      ${p.gender ? `<g:gender>${escapeXml(p.gender)}</g:gender>` : ""}
      ${p.age_group ? `<g:age_group>${escapeXml(p.age_group)}</g:age_group>` : ""}
      ${p.custom_label_0 ? `<g:custom_label_0>${escapeXml(p.custom_label_0)}</g:custom_label_0>` : ""}
      ${p.custom_label_1 ? `<g:custom_label_1>${escapeXml(p.custom_label_1)}</g:custom_label_1>` : ""}
      ${p.custom_label_2 ? `<g:custom_label_2>${escapeXml(p.custom_label_2)}</g:custom_label_2>` : ""}
      ${p.custom_label_3 ? `<g:custom_label_3>${escapeXml(p.custom_label_3)}</g:custom_label_3>` : ""}
      ${p.custom_label_4 ? `<g:custom_label_4>${escapeXml(p.custom_label_4)}</g:custom_label_4>` : ""}
    </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>${escapeXml(process.env.NEXT_PUBLIC_NEXT_SHOP_NAME || "Shop")}</title>
    <link>${process.env.NEXT_PUBLIC_SITE_URL}</link>
    <description>Google Merchant Centre Product Feed</description>
    ${xmlItems}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": "attachment; filename=google_product_feed.xml",
    },
  });
}
