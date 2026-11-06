import prisma from "@/lib/prisma";
import { CONTENT_PAGE_SLUGS } from "@/lib/contentPageDefinitions";
import { unstable_cache } from "next/cache";

// Content is authored by privileged administrators, but it is still cleaned
// before storage/rendering so scripts, event handlers and executable URLs can
// never be introduced into a public policy page.
export function sanitizeContentPageHtml(value) {
  return String(value || "")
    .replace(/<(script|style|object|embed|iframe|meta|link|base)[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(script|style|object|embed|iframe|meta|link|base)\b[^>]*\/?\s*>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>'=<>`]+)/gi, "")
    .replace(/\s+(href|src)\s*=\s*(["'])\s*(?:javascript:|data:text\/html)[\s\S]*?\2/gi, ' $1="#"')
    .replace(/\s+(href|src)\s*=\s*(?:javascript:|data:text\/html)[^\s>]*/gi, ' $1="#"')
    .replace(/<\/?(?:form|input|button|textarea|select|option)\b[^>]*>/gi, "")
    .trim();
}

async function queryPublicContentPage(slug) {
  if (!CONTENT_PAGE_SLUGS.has(slug)) return null;
  const page = await prisma.contentPage.findUnique({
    where: { slug },
    select: {
      slug: true,
      title: true,
      content: true,
      metaTitle: true,
      metaDescription: true,
      updatedAt: true,
      isPublished: true,
      footerLogo: { select: { name: true, width: true, height: true } },
    },
  });
  if (!page?.isPublished) return null;
  return { ...page, content: sanitizeContentPageHtml(page.content) };
}

const readCachedContentPage = unstable_cache(
  queryPublicContentPage,
  ["public-content-page"],
  { revalidate: false, tags: ["content-pages"] },
);

export async function getPublicContentPage(slug) {
  return process.env.NODE_ENV === "development"
    ? queryPublicContentPage(slug)
    : readCachedContentPage(slug);
}
