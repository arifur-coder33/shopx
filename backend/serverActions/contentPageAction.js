"use server";

import { sanitizeContentPageHtml } from "@/backend/services/contentPageService";
import { normalizeContactDetails } from "@/backend/services/contactDetailsService";
import { requireProcurementPermission } from "@/backend/utils/procurement";
import { CONTENT_PAGE_DEFINITIONS, CONTENT_PAGE_SLUGS } from "@/lib/contentPageDefinitions";
import prisma from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";

const clean = (value) => String(value || "").trim();

const optionalUrl = (value, label) => {
  const input = clean(value);
  if (!input) return null;
  let parsed;
  try {
    parsed = new URL(input);
  } catch {
    throw new Error(`${label} must be a valid URL.`);
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`${label} must use http or https.`);
  }
  return parsed.toString();
};

const optionalContactText = (value, label, max = 80) => {
  const input = clean(value);
  if (input.length > max) throw new Error(`${label} cannot exceed ${max} characters.`);
  return input || null;
};

export async function getContentPagesForAdmin() {
  try {
    await requireProcurementPermission("contentPage", "view");
    const rows = await prisma.contentPage.findMany({
      where: { slug: { in: [...CONTENT_PAGE_SLUGS] } },
      orderBy: { slug: "asc" },
      include: { footerLogo: { select: { id: true, name: true, displayName: true, width: true, height: true, sizeBytes: true } } },
    });
    const bySlug = new Map(rows.map((page) => [page.slug, page]));
    const siteSetting = await prisma.siteSetting.findFirst({
      select: {
        fbLink: true,
        messengerLink: true,
        whatsappNumber: true,
        phoneNumber1: true,
        email: true,
      },
    });
    const contactDetails = normalizeContactDetails(siteSetting);
    const data = CONTENT_PAGE_DEFINITIONS.map((definition) => ({
      ...definition,
      id: bySlug.get(definition.slug)?.id || null,
      title: bySlug.get(definition.slug)?.title ?? (definition.slug === "footer" ? "" : definition.label),
      content: bySlug.get(definition.slug)?.content || "",
      metaTitle: bySlug.get(definition.slug)?.metaTitle || "",
      metaDescription: bySlug.get(definition.slug)?.metaDescription || "",
      isPublished: bySlug.get(definition.slug)?.isPublished ?? true,
      updatedAt: bySlug.get(definition.slug)?.updatedAt || null,
      ...(definition.slug === "footer" && { footerLogo: bySlug.get("footer")?.footerLogo || null }),
      ...(definition.slug === "contact" && { contactDetails }),
    }));
    return { success: true, data };
  } catch (error) {
    return { success: false, message: error.message || "Failed to load content pages." };
  }
}

export async function updateContentPage(formData) {
  try {
    const userId = await requireProcurementPermission("contentPage", "update");
    const values = Object.fromEntries(formData.entries());
    const slug = clean(values.slug);
    if (!CONTENT_PAGE_SLUGS.has(slug)) throw new Error("Invalid content page.");

    const title = clean(values.title);
    const content = sanitizeContentPageHtml(values.content);
    const metaTitle = clean(values.metaTitle);
    const metaDescription = clean(values.metaDescription);
    const footerLogoId = slug === "footer" ? clean(values.footerLogo).split(",")[0] || null : null;
    if ((slug !== "footer" && !title) || title.length > 120) throw new Error("Title must be between 1 and 120 characters.");
    if (slug !== "footer" && !content) throw new Error("Page content is required.");
    if (content.length > 200000) throw new Error("Page content is too large.");
    if (metaTitle.length > 160) throw new Error("SEO title cannot exceed 160 characters.");
    if (metaDescription.length > 320) throw new Error("SEO description cannot exceed 320 characters.");
    if (slug === "footer" && footerLogoId && !(await prisma.media.findUnique({ where: { id: footerLogoId }, select: { id: true } }))) {
      throw new Error("Selected footer logo was not found in the media library.");
    }

    const pageData = {
      title,
      content,
      metaTitle: metaTitle || null,
      metaDescription: metaDescription || null,
      isPublished: values.isPublished === "true",
      updatedBy: userId,
      ...(slug === "footer" && { footerLogoId }),
    };
    const contactData = slug === "contact"
      ? {
          fbLink: optionalUrl(values.facebookPage, "Facebook page"),
          messengerLink: optionalUrl(values.messenger, "Messenger link"),
          whatsappNumber: optionalContactText(values.whatsappNumber, "WhatsApp number"),
          phoneNumber1: optionalContactText(values.phoneNumber, "Phone number"),
          email: optionalContactText(values.email, "Email", 160),
        }
      : null;
    if (contactData?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactData.email)) {
      throw new Error("Email address is invalid.");
    }

    const savedPage = await prisma.$transaction(async (tx) => {
      const page = await tx.contentPage.upsert({
        where: { slug },
        update: pageData,
        create: { slug, ...pageData, createdBy: userId },
        include: { footerLogo: { select: { id: true, name: true, displayName: true, width: true, height: true, sizeBytes: true } } },
      });
      if (contactData) {
        const setting = await tx.siteSetting.findFirst({ select: { id: true } });
        if (setting) {
          await tx.siteSetting.update({ where: { id: setting.id }, data: contactData });
        } else {
          await tx.siteSetting.create({ data: contactData });
        }
      }
      return page;
    });

    revalidateTag("content-pages");
    if (slug === "footer") revalidatePath("/", "layout");
    if (slug === "contact") {
      revalidateTag("contact-details");
      revalidateTag("site-setting");
      revalidatePath("/", "layout");
    }
    revalidatePath(`/${slug}`);
    revalidatePath("/admin/settings/content-pages");
    return { success: true, message: `${title || "Footer content"} updated.`, data: { footerLogo: savedPage.footerLogo || null } };
  } catch (error) {
    return { success: false, message: error.message || "Failed to update content page." };
  }
}
