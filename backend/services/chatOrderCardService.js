import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import prisma from "@/lib/prisma";

const escapeXml = (value) => String(value ?? "").replace(/[&<>"']/gu, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]);
const money = (value) => `৳${Number(value || 0).toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;
async function trustedProductImage(item, siteUrl) {
  const raw = item.variation?.thumbnail?.url || (item.variation?.thumbnail?.name ? `/uploads/${item.variation.thumbnail.name}` : null)
    || item.product?.thumbnail?.url || (item.product?.thumbnail?.name ? `/uploads/${item.product.thumbnail.name}` : null)
    || item.thumbnail;
  if (!raw) return null;
  try {
    const url = new URL(raw, siteUrl);
    const siteHost = new URL(siteUrl).hostname;
    if (url.protocol !== "https:" || !(url.hostname === siteHost || url.hostname === "cloudinary.com" || url.hostname.endsWith(".cloudinary.com"))) return null;
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    const type = response.headers.get("content-type") || "";
    if (!response.ok || !type.startsWith("image/") || type.includes("svg")) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.length > 8 * 1024 * 1024) return null;
    return await sharp(bytes, { limitInputPixels: 25_000_000 }).rotate().resize(84, 84, { fit: "cover" }).png().toBuffer();
  } catch { return null; }
}

export async function loadChatOrderCard(orderNo) {
  const order = await prisma.order.findUnique({
    where: { orderNo },
    select: {
      orderNo: true, phoneNumber: true, orderPrice: true, deliveryCharge: true, dueAmount: true, paidAmount: true,
      orderItems: { orderBy: { orderItemNo: "asc" }, select: {
        productName: true, productCode: true, sku: true, price: true, quantity: true, combinations: true, thumbnail: true,
        product: { select: { deliveryMinDays: true, deliveryMaxDays: true, thumbnail: { select: { url: true, name: true } } } },
        variation: { select: { thumbnail: { select: { url: true, name: true } } } },
      } },
    },
  });
  return order;
}

export async function renderChatOrderCard(order, siteUrl) {
  const items = order.orderItems.slice(0, 20);
  const leadTimes = [...new Set(items.map((item) => item.product?.deliveryMinDays && item.product?.deliveryMaxDays ? `${item.product?.deliveryMinDays}–${item.product?.deliveryMaxDays} দিন` : "২–৫ দিন"))];
  const leadTime = leadTimes.length === 1 ? leadTimes[0] : "প্রতিটি পণ্যের জন্য আলাদা";
  const fontData = await readFile(join(process.cwd(), "public", "fonts", "SolaimanLipi.ttf")).then((font) => font.toString("base64")).catch(() => "");
  const embeddedFont = fontData ? `@font-face{font-family:OrderCardBangla;src:url(data:font/ttf;base64,${fontData}) format('truetype');font-weight:400}` : "";
  const height = 860 + items.length * 110;
  const itemRows = items.map((item, index) => {
    let combinations = "";
    try { combinations = (JSON.parse(item.combinations || "[]") || []).map((row) => `${row.name}: ${row.value}`).join(" · "); } catch {}
    const y = 530 + index * 110;
    return `<text x="180" y="${y}" class="item">${escapeXml(String(item.productName).slice(0, 38))}</text><text x="180" y="${y + 28}" class="meta">${escapeXml(item.productCode || item.sku || "")} ${combinations ? `· ${escapeXml(combinations.slice(0, 38))}` : ""} · পরিমাণ ${item.quantity}</text><text x="824" y="${y + 8}" text-anchor="end" class="item">${escapeXml(money(item.price * item.quantity))}</text>`;
  }).join("");
  const totalsY = 500 + items.length * 110 + 24;
  const totalAmount = Number(order.dueAmount || 0) + Number(order.paidAmount || 0);
  const svg = `<svg width="900" height="${height}" viewBox="0 0 900 ${height}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f05a24"/><stop offset="1" stop-color="#dd3d0b"/></linearGradient><style>${embeddedFont}.title{font:700 54px OrderCardBangla, sans-serif;fill:#fff}.sub{font:400 25px OrderCardBangla, sans-serif;fill:#fff}.eyebrow{font:700 18px OrderCardBangla, sans-serif;letter-spacing:1px;fill:#ffe1d4}.metaLight{font:600 20px OrderCardBangla, sans-serif;fill:#fff}.section{font:700 21px OrderCardBangla, sans-serif;fill:#263348}.item{font:600 23px OrderCardBangla, sans-serif;fill:#263348}.meta{font:400 18px OrderCardBangla, sans-serif;fill:#718096}.total{font:700 34px OrderCardBangla, sans-serif;fill:#e64b17}.footer{font:400 17px OrderCardBangla, sans-serif;fill:#8290a3}</style></defs><rect width="900" height="${height}" rx="42" fill="#f4f7fb"/><rect x="0" y="0" width="900" height="390" rx="42" fill="url(#bg)"/><circle cx="770" cy="88" r="95" fill="#ffffff" opacity=".10"/><circle cx="840" cy="310" r="125" fill="#ffffff" opacity=".08"/><text x="76" y="92" class="eyebrow">অর্ডার নিশ্চিত</text><text x="76" y="176" class="title">ধন্যবাদ!</text><text x="76" y="232" class="sub">আপনার অর্ডারটি সফলভাবে সম্পন্ন হয়েছে।</text><text x="76" y="300" class="metaLight">অর্ডার নম্বর: ${escapeXml(order.orderNo)}</text><rect x="56" y="438" width="788" height="${items.length * 110 + 320}" rx="26" fill="#ffffff"/><text x="76" y="482" class="section">অর্ডারের বিবরণ</text>${itemRows}<line x1="76" y1="${totalsY}" x2="824" y2="${totalsY}" stroke="#e5eaf1" stroke-width="2"/><text x="76" y="${totalsY + 46}" class="meta">ডেলিভারি চার্জ</text><text x="824" y="${totalsY + 46}" text-anchor="end" class="item">${escapeXml(money(order.deliveryCharge))}</text><text x="76" y="${totalsY + 100}" class="section">সর্বমোট</text><text x="824" y="${totalsY + 100}" text-anchor="end" class="total">${escapeXml(money(totalAmount))}</text><rect x="56" y="${totalsY + 132}" width="788" height="96" rx="20" fill="#fff0e9"/><text x="84" y="${totalsY + 172}" class="meta">সম্ভাব্য ডেলিভারি</text><text x="84" y="${totalsY + 207}" class="item">${escapeXml(leadTime)}</text><text x="450" y="${height - 40}" text-anchor="middle" class="footer">আমাদের সঙ্গে কেনাকাটার জন্য ধন্যবাদ</text></svg>`;
  let image = await sharp(Buffer.from(svg)).png().toBuffer();
  const photos = await Promise.all(items.map(async (item, index) => {
    const photo = await trustedProductImage(item, siteUrl);
    return photo ? { input: photo, left: 76, top: 505 + index * 110 } : null;
  }));
  if (photos.some(Boolean)) image = await sharp(image).composite(photos.filter(Boolean)).png().toBuffer();
  return image;
}
