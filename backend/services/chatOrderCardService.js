import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import prisma from "@/lib/prisma";
import { launchChatBrowser } from "@/backend/services/chatBrowser";

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
  const fontData = await readFile(join(process.cwd(), "public", "fonts", "SolaimanLipi.ttf"))
    .then((font) => font.toString("base64"))
    .catch((error) => {
      console.error("Bengali font unavailable for chat order card:", error?.code || error?.message || "font_read_failed");
      throw new Error("chat_order_card_font_unavailable");
    });
  const embeddedFont = fontData ? `@font-face{font-family:OrderCardBangla;src:url(data:font/ttf;base64,${fontData}) format('truetype');font-weight:400}` : "";
  const height = 900 + items.length * 156;
  const itemRows = items.map((item, index) => {
    let combinations = "";
    try { combinations = (JSON.parse(item.combinations || "[]") || []).map((row) => `${row.name}: ${row.value}`).join(" · "); } catch {}
    const y = 552 + index * 156;
    return `<text x="214" y="${y}" class="item">${escapeXml(String(item.productName).slice(0, 34))}</text><text x="214" y="${y + 42}" class="meta">${escapeXml(item.productCode || item.sku || "")}</text>${combinations ? `<text x="214" y="${y + 78}" class="variant">${escapeXml(combinations.slice(0, 44))}</text>` : ""}<text x="214" y="${y + 116}" class="meta">পরিমাণ ${item.quantity}</text><text x="824" y="${y + 18}" text-anchor="end" class="item">${escapeXml(money(item.price * item.quantity))}</text>`;
  }).join("");
  const totalsY = 522 + items.length * 156 + 42;
  const totalAmount = Number(order.dueAmount || 0) + Number(order.paidAmount || 0);
  const svg = `<svg width="900" height="${height}" viewBox="0 0 900 ${height}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f05a24"/><stop offset="1" stop-color="#dd3d0b"/></linearGradient><style>${embeddedFont}.title{font:700 60px OrderCardBangla, sans-serif;fill:#fff}.sub{font:400 30px OrderCardBangla, sans-serif;fill:#fff}.eyebrow{font:700 22px OrderCardBangla, sans-serif;letter-spacing:1px;fill:#ffe1d4}.metaLight{font:600 25px OrderCardBangla, sans-serif;fill:#fff}.section{font:700 29px OrderCardBangla, sans-serif;fill:#263348}.item{font:600 32px OrderCardBangla, sans-serif;fill:#263348}.meta{font:400 25px OrderCardBangla, sans-serif;fill:#536176}.variant{font:600 25px OrderCardBangla, sans-serif;fill:#087e67}.total{font:700 42px OrderCardBangla, sans-serif;fill:#e64b17}.footer{font:400 22px OrderCardBangla, sans-serif;fill:#64748b}</style></defs><rect width="900" height="${height}" rx="42" fill="#f4f7fb"/><rect x="0" y="0" width="900" height="390" rx="42" fill="url(#bg)"/><circle cx="770" cy="88" r="95" fill="#ffffff" opacity=".10"/><circle cx="840" cy="310" r="125" fill="#ffffff" opacity=".08"/><text x="76" y="92" class="eyebrow">অর্ডার নিশ্চিত</text><text x="76" y="176" class="title">ধন্যবাদ!</text><text x="76" y="232" class="sub">আপনার অর্ডারটি সফলভাবে সম্পন্ন হয়েছে।</text><text x="76" y="300" class="metaLight">অর্ডার নম্বর: ${escapeXml(order.orderNo)}</text><rect x="56" y="438" width="788" height="${items.length * 156 + 340}" rx="26" fill="#ffffff"/><text x="76" y="492" class="section">অর্ডারের বিবরণ</text>${itemRows}<line x1="76" y1="${totalsY}" x2="824" y2="${totalsY}" stroke="#e5eaf1" stroke-width="2"/><text x="76" y="${totalsY + 48}" class="meta">ডেলিভারি চার্জ</text><text x="824" y="${totalsY + 48}" text-anchor="end" class="item">${escapeXml(money(order.deliveryCharge))}</text><text x="76" y="${totalsY + 112}" class="section">সর্বমোট</text><text x="824" y="${totalsY + 112}" text-anchor="end" class="total">${escapeXml(money(totalAmount))}</text><rect x="56" y="${totalsY + 146}" width="788" height="110" rx="20" fill="#fff0e9"/><text x="84" y="${totalsY + 192}" class="meta">সম্ভাব্য ডেলিভারি</text><text x="84" y="${totalsY + 232}" class="item">${escapeXml(leadTime)}</text><text x="450" y="${height - 34}" text-anchor="middle" class="footer">আমাদের সঙ্গে কেনাকাটার জন্য ধন্যবাদ</text></svg>`;
  let browser = null;
  let image;
  try {
    browser = await launchChatBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 900, height, deviceScaleFactor: 1 });
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>@page{margin:0}html,body{margin:0;padding:0;width:900px;height:${height}px;overflow:hidden}body{font-family:OrderCardBangla,sans-serif}</style></head><body>${svg}</body></html>`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.fonts.ready);
    image = Buffer.from(await page.screenshot({ type: "png", captureBeyondViewport: true }));
    await page.close();
  } finally {
    if (browser) await browser.close();
  }
  const photos = await Promise.all(items.map(async (item, index) => {
    const photo = await trustedProductImage(item, siteUrl);
    const image = photo ? await sharp(photo).resize(122, 122, { fit: "cover" }).png().toBuffer() : null;
    return image ? { input: image, left: 76, top: 520 + index * 156 } : null;
  }));
  if (photos.some(Boolean)) image = await sharp(image).composite(photos.filter(Boolean)).png().toBuffer();
  return image;
}
