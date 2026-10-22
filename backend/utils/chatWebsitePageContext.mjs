import prisma from "@/lib/prisma";

export async function getWebsitePageProductContext(value) {
  const raw = String(value || "").trim().slice(0, 500);
  if (!raw || raw.startsWith("//") || /^[a-z][a-z\d+.-]*:/i.test(raw)) return null;
  let pathname;
  try { pathname = new URL(raw, "https://local.invalid").pathname; } catch { return null; }
  const match = pathname.match(/^\/(?:product|buynow)\/([^/]+)\/?$/i);
  if (!match) return null;
  let slug;
  try { slug = decodeURIComponent(match[1]); } catch { return null; }
  if (!slug || slug.length > 200 || slug.includes("/")) return null;
  const product = await prisma.product.findFirst({
    where: { slug, isActive: true, status: "ACTIVE" },
    select: { id: true, title: true, slug: true },
  });
  return product ? { path: pathname, productId: product.id, productTitle: product.title, productSlug: product.slug } : null;
}
