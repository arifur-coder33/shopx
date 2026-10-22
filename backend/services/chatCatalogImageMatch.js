import sharp from "sharp";
import prisma from "@/lib/prisma";
import { getSiteUrl } from "@/lib/siteUrl";

const fingerprintCache = globalThis.__chatCatalogFingerprintCache || (globalThis.__chatCatalogFingerprintCache = new Map());
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function hamming(first, second) {
  let bits = first ^ second;
  let count = 0;
  while (bits) { bits &= bits - 1n; count += 1; }
  return count;
}

async function fingerprint(bytes) {
  const source = sharp(bytes, { limitInputPixels: 30_000_000 }).rotate();
  const metadata = await source.metadata();
  const horizontal = await source.clone().resize(9, 8, { fit: "fill" }).grayscale().raw().toBuffer();
  const average = await source.clone().resize(8, 8, { fit: "fill" }).grayscale().raw().toBuffer();
  let differenceHash = 0n;
  for (let y = 0; y < 8; y += 1) for (let x = 0; x < 8; x += 1) {
    differenceHash = (differenceHash << 1n) | BigInt(horizontal[y * 9 + x] > horizontal[y * 9 + x + 1] ? 1 : 0);
  }
  const mean = average.reduce((total, pixel) => total + pixel, 0) / average.length;
  let averageHash = 0n;
  for (const pixel of average) averageHash = (averageHash << 1n) | BigInt(pixel >= mean ? 1 : 0);
  return { differenceHash, averageHash, ratio: metadata.width / metadata.height };
}

async function catalogFingerprint(media, siteUrl, deadline) {
  const raw = media?.url || (media?.name ? `/uploads/${media.name}` : null);
  if (!raw || Date.now() > deadline) return null;
  let url;
  try {
    url = new URL(raw, siteUrl);
    const siteHost = new URL(siteUrl).hostname;
    if (url.protocol !== "https:" || !(url.hostname === siteHost || url.hostname === "cloudinary.com" || url.hostname.endsWith(".cloudinary.com"))) return null;
  } catch { return null; }
  const cached = fingerprintCache.get(url.href);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  try {
    const response = await fetch(url, { redirect: "error", cache: "no-store", signal: AbortSignal.timeout(Math.min(5000, Math.max(1000, deadline - Date.now()))) });
    if (!response.ok || !String(response.headers.get("content-type") || "").startsWith("image/") || Number(response.headers.get("content-length") || 0) > MAX_IMAGE_BYTES) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) return null;
    const value = await fingerprint(bytes);
    fingerprintCache.set(url.href, { value, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
    if (fingerprintCache.size > 3000) fingerprintCache.delete(fingerprintCache.keys().next().value);
    return value;
  } catch { return null; }
}

export async function findMatchingCatalogImage(customerImage) {
  if (!customerImage?.base64) return null;
  let target;
  try { target = await fingerprint(Buffer.from(customerImage.base64, "base64")); } catch { return null; }
  const siteUrl = await getSiteUrl();
  const products = await prisma.product.findMany({
    where: { isActive: true, status: "ACTIVE" },
    orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
    take: 1200,
    select: { id: true, thumbnail: { select: { url: true, name: true, width: true, height: true } }, gallery: { take: 5, select: { media: { select: { url: true, name: true, width: true, height: true } } } }, variations: { take: 12, select: { thumbnail: { select: { url: true, name: true, width: true, height: true } } } } },
  });
  const seen = new Set();
  const images = products.flatMap((product) => [product.thumbnail, ...product.variations.map((variant) => variant.thumbnail), ...product.gallery.map((item) => item.media)].filter(Boolean).map((media) => ({ productId: product.id, media })));
  const sorted = images.filter(({ media }) => {
    const key = media.url || media.name;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((first, second) => {
    const distance = (item) => item.media.width && item.media.height ? Math.abs(item.media.width / item.media.height - target.ratio) : 1;
    return distance(first) - distance(second);
  }).slice(0, 1500);
  let cursor = 0;
  let winner = null;
  const deadline = Date.now() + 14000;
  await Promise.all(Array.from({ length: Math.min(16, sorted.length) }, async () => {
    while (cursor < sorted.length && Date.now() < deadline && (!winner || winner.score > 2)) {
      const item = sorted[cursor++];
      const match = await catalogFingerprint(item.media, siteUrl, deadline);
      if (!match || Math.abs(match.ratio - target.ratio) > 0.12) continue;
      const difference = hamming(target.differenceHash, match.differenceHash);
      const average = hamming(target.averageHash, match.averageHash);
      if (difference <= 7 && average <= 11) {
        const score = difference + average;
        if (!winner || score < winner.score) winner = { productId: item.productId, score };
      }
    }
  }));
  return winner?.productId || null;
}
