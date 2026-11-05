import prisma from "@/lib/prisma";
import { getSiteUrl } from "@/lib/siteUrl";
import { htmlToText } from "html-to-text";
import { extractPublicLinks, readPublicLink } from "@/backend/utils/publicLinkReader.mjs";
import { getActiveCampaigns, getProductCardCampaignData } from "@/backend/services/campaignService";

const text = (value, limit) => htmlToText(String(value || ""), {
  wordwrap: false,
  selectors: [{ selector: "script", format: "skip" }, { selector: "style", format: "skip" }],
}).replace(/\s+/g, " ").trim().slice(0, limit);

async function readPost(postId, platform, credentials) {
  const version = credentials?.graphApiVersion || process.env.META_GRAPH_API_VERSION;
  if (!/^[0-9_]{1,120}$/.test(String(postId || "")) || !/^v\d+\.\d+$/.test(version || "") || !credentials?.messengerPageAccessToken) return { available: false, caption: "", links: [] };
  const fields = platform === "INSTAGRAM" ? ["caption,permalink"] : ["message,attachments{url,unshimmed_url}", "message"];
  for (const field of fields) {
    try {
      const url = new URL(`https://graph.facebook.com/${version}/${encodeURIComponent(postId)}`);
      url.searchParams.set("fields", field);
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${credentials.messengerPageAccessToken}` },
        cache: "no-store", redirect: "error", signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) continue;
      const post = await response.json();
      return {
        available: true,
        caption: String(post.caption || post.message || "").slice(0, 8000),
        links: (post.attachments?.data || []).slice(0, 3).flatMap((row) => [row.unshimmed_url, row.url].filter(Boolean)),
      };
    } catch { /* Missing permission/deleted posts must not prevent a reply. */ }
  }
  return { available: false, caption: "", links: [] };
}

function productSlug(value, siteUrl) {
  const url = new URL(value);
  const host = (name) => name.toLowerCase().replace(/^www\./, "");
  const origins = [siteUrl, process.env.NEXT_PUBLIC_SITE_URL, process.env.SITE_URL].filter(Boolean);
  if (!origins.some((origin) => {
    try { return host(url.hostname) === host(new URL(origin).hostname); } catch { return false; }
  })) return null;
  const match = url.pathname.match(/^\/(?:product|buynow)\/([^/]+)\/?$/i);
  if (!match) return null;
  return decodeURIComponent(match[1]);
}

async function productContext(slug, campaigns) {
  const product = await prisma.product.findFirst({
    where: { slug, isActive: true, status: "ACTIVE" },
    select: {
      id: true, title: true, categoryId: true, description: true,
      allowOutOfStockOrder: true, codAvailable: true,
      advancePaymentType: true, advancePaymentValueType: true, advancePaymentValue: true,
      deliveryMinDays: true, deliveryMaxDays: true,
      specifications: { take: 30, select: { value: true, specification: { select: { name: true } } } },
      questionsAnswers: { take: 10, select: { question: true, answer: true } },
      variations: { take: 30, select: {
        sku: true, regularPrice: true, discountPrice: true,
        stocks: { select: { available: true } },
        combinations: { select: { variationName: { select: { name: true } }, variationValue: { select: { value: true } } } },
      } },
    },
  });
  if (!product) return null;
  const { variations, ...details } = product;
  return {
    ...details,
    description: text(product.description, 3500),
    questionsAnswers: product.questionsAnswers.map((row) => ({ question: text(row.question, 350), answer: text(row.answer, 1200) })),
    variations: variations.map(({ stocks, combinations, ...variant }) => ({
      ...variant,
      stock: stocks.reduce((sum, row) => sum + Math.max(0, Number(row.available) || 0), 0),
      options: combinations.map((row) => `${row.variationName.name}: ${row.variationValue.value}`),
      ...(campaigns ? getProductCardCampaignData({ campaigns, productId: product.id, categoryId: product.categoryId, regularPrice: variant.regularPrice, discountPrice: variant.discountPrice }) : { campaignDataUnavailable: true }),
    })),
  };
}

export async function loadPublicCommentContext({ commentText, postId, platform, credentials }) {
  const [post, siteUrl, campaigns] = await Promise.all([
    readPost(postId, platform, credentials),
    Promise.resolve(getSiteUrl()),
    getActiveCampaigns().catch(() => null),
  ]);
  // Comment links take priority when the customer asks about a different item.
  const sources = [commentText, post.caption, ...post.links].map((value) => String(value || "").replace(/(^|\s)(\/(?:product|buynow)\/[^\s<>"']+)/g, (_match, prefix, path) => `${prefix}${new URL(path, siteUrl).href}`));
  const links = extractPublicLinks(sources.join("\n"), 3);
  const linkedSources = await Promise.all(links.map(async (url) => {
    try {
      let slug = productSlug(url, siteUrl);
      if (slug) return { url, sourceType: "STORE_PRODUCT", product: await productContext(slug, campaigns) };
      const page = await readPublicLink(url);
      slug = productSlug(page.url, siteUrl);
      if (slug) return { url, resolvedUrl: page.url, sourceType: "STORE_PRODUCT", product: await productContext(slug, campaigns) };
      return { url, resolvedUrl: page.url, sourceType: "PUBLIC_WEB_PAGE", content: text(page.body, 3000) };
    } catch {
      return { url, unavailable: true };
    }
  }));
  return { postAvailable: post.available, caption: post.caption, linkedSources };
}
