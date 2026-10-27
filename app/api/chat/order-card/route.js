import { createHmac, timingSafeEqual } from "node:crypto";
import sharp from "sharp";
import prisma from "@/lib/prisma";
import { getSiteUrl } from "@/lib/siteUrl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const escapeXml = (value) => String(value ?? "").replace(/[&<>"']/gu, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]);
const money = (value) => `৳${Number(value || 0).toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;
const signingSecret = () => process.env.CHAT_ORDER_CARD_SECRET || process.env.AUTH_SECRET || process.env.PROVIDER_CREDENTIAL_ENCRYPTION_KEY || "";

function isSignatureValid(orderNo, phoneNumber, signature) {
  if (!signingSecret() || !/^[a-f0-9]{64}$/iu.test(String(signature || ""))) return false;
  const expected = createHmac("sha256", signingSecret()).update(`${orderNo}:${phoneNumber}`).digest();
  const received = Buffer.from(signature, "hex");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

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
    return await sharp(bytes, { limitInputPixels: 25_000_000 }).rotate().resize(260, 260, { fit: "cover" }).png().toBuffer();
  } catch { return null; }
}

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const orderNo = String(params.get("o") || "").slice(0, 40);
  const signature = String(params.get("s") || "");
  if (!orderNo || !signature) return new Response("Not found", { status: 404 });
  const order = await prisma.order.findUnique({
    where: { orderNo },
    select: {
      orderNo: true, phoneNumber: true, orderPrice: true, deliveryCharge: true, dueAmount: true,
      orderItems: { orderBy: { orderItemNo: "asc" }, select: {
        productName: true, productCode: true, sku: true, price: true, quantity: true, combinations: true, thumbnail: true,
        product: { select: { deliveryMinDays: true, deliveryMaxDays: true, thumbnail: { select: { url: true, name: true } } } },
        variation: { select: { thumbnail: { select: { url: true, name: true } } } },
      } },
    },
  });
  if (!order || !isSignatureValid(orderNo, order.phoneNumber, signature)) return new Response("Not found", { status: 404 });
  const items = order.orderItems.slice(0, 20);
  const leadTimes = [...new Set(items.map((item) => item.product.deliveryMinDays && item.product.deliveryMaxDays ? `${item.product.deliveryMinDays}–${item.product.deliveryMaxDays} days` : "2–5 days"))];
  const leadTime = leadTimes.length === 1 ? leadTimes[0] : "As listed for each product";
  const height = 860 + items.length * 76;
  const itemRows = items.map((item, index) => {
    let combinations = "";
    try { combinations = (JSON.parse(item.combinations || "[]") || []).map((row) => `${row.name}: ${row.value}`).join(" · "); } catch {}
    const y = 500 + index * 76;
    return `<text x="76" y="${y}" class="item">${escapeXml(item.productName).slice(0, 66)}</text><text x="76" y="${y + 28}" class="meta">${escapeXml(item.productCode || item.sku || "")} ${combinations ? `· ${escapeXml(combinations).slice(0, 65)}` : ""} · Qty ${item.quantity}</text><text x="824" y="${y + 8}" text-anchor="end" class="item">${escapeXml(money(item.price * item.quantity))}</text>`;
  }).join("");
  const totalsY = 500 + items.length * 76 + 24;
  const totalAmount = Number(order.dueAmount ?? (Number(order.orderPrice) + Number(order.deliveryCharge)));
  const svg = `<svg width="900" height="${height}" viewBox="0 0 900 ${height}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f05a24"/><stop offset="1" stop-color="#dd3d0b"/></linearGradient></defs><rect width="900" height="${height}" rx="42" fill="#f4f7fb"/><rect x="0" y="0" width="900" height="390" rx="42" fill="url(#bg)"/><circle cx="770" cy="88" r="95" fill="#ffffff" opacity=".10"/><circle cx="840" cy="310" r="125" fill="#ffffff" opacity=".08"/><text x="76" y="92" class="eyebrow">ORDER CONFIRMED</text><text x="76" y="176" class="title">Congratulations!</text><text x="76" y="232" class="sub">Your order has been placed successfully.</text><text x="76" y="300" class="metaLight">ORDER NO.  ${escapeXml(order.orderNo)}</text><rect x="56" y="438" width="788" height="${items.length * 76 + 320}" rx="26" fill="#ffffff"/><text x="76" y="482" class="section">ORDER DETAILS</text>${itemRows}<line x1="76" y1="${totalsY}" x2="824" y2="${totalsY}" stroke="#e5eaf1" stroke-width="2"/><text x="76" y="${totalsY + 46}" class="meta">Delivery charge</text><text x="824" y="${totalsY + 46}" text-anchor="end" class="item">${escapeXml(money(order.deliveryCharge))}</text><text x="76" y="${totalsY + 100}" class="section">TOTAL</text><text x="824" y="${totalsY + 100}" text-anchor="end" class="total">${escapeXml(money(totalAmount))}</text><rect x="56" y="${totalsY + 132}" width="788" height="96" rx="20" fill="#fff0e9"/><text x="84" y="${totalsY + 172}" class="meta">Estimated delivery</text><text x="84" y="${totalsY + 207}" class="item">${escapeXml(leadTime)}</text><text x="450" y="${height - 40}" text-anchor="middle" class="footer">Thank you for shopping with us</text><style>.title{font:700 54px Arial,sans-serif;fill:#fff}.sub{font:400 25px Arial,sans-serif;fill:#fff}.eyebrow{font:700 18px Arial,sans-serif;letter-spacing:4px;fill:#ffe1d4}.metaLight{font:600 20px Arial,sans-serif;letter-spacing:1px;fill:#fff}.section{font:700 21px Arial,sans-serif;letter-spacing:2px;fill:#263348}.item{font:600 23px Arial,sans-serif;fill:#263348}.meta{font:400 18px Arial,sans-serif;fill:#718096}.total{font:700 34px Arial,sans-serif;fill:#e64b17}.footer{font:400 17px Arial,sans-serif;fill:#8290a3}</style></svg>`;
  let image = await sharp(Buffer.from(svg)).png().toBuffer();
  const photo = await trustedProductImage(items[0], await getSiteUrl());
  if (photo) image = await sharp(image).composite([{ input: photo, left: 610, top: 270 }]).png().toBuffer();
  return new Response(image, { headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" } });
}
