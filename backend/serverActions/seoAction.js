"use server";

import { requireProcurementPermission } from "@/backend/utils/procurement";
import { CONTENT_PAGE_DEFINITIONS } from "@/lib/contentPageDefinitions";
import prisma from "@/lib/prisma";
import { normalizeGoogleSiteVerification } from "@/backend/services/siteAppearanceService";
import { revalidatePath, revalidateTag } from "next/cache";

const clean = (value) => String(value || "").trim();
const EDITABLE_SEO_PAGES = CONTENT_PAGE_DEFINITIONS.filter((page) => page.slug !== "footer");

export async function getSeoSettingsForAdmin() {
  try {
    await requireProcurementPermission("seoSettings", "view");
    const [setting, pages] = await Promise.all([
      prisma.siteSetting.findFirst({
        select: {
          seoTitle: true,
          seoDescription: true,
          seoKeywords: true,
          googleSiteVerification: true,
          name: true,
        },
      }),
      prisma.contentPage.findMany({
        where: { slug: { in: EDITABLE_SEO_PAGES.map(({ slug }) => slug) } },
        select: { slug: true, title: true, metaTitle: true, metaDescription: true, isPublished: true },
      }),
    ]);
    const pageBySlug = new Map(pages.map((page) => [page.slug, page]));
    return {
      success: true,
      data: {
        siteName: setting?.name || "Shop",
        seoTitle: setting?.seoTitle || "",
        seoDescription: setting?.seoDescription || "",
        seoKeywords: setting?.seoKeywords || "",
          googleSiteVerification: normalizeGoogleSiteVerification(setting?.googleSiteVerification),
        pages: EDITABLE_SEO_PAGES.map((definition) => {
          const page = pageBySlug.get(definition.slug);
          return {
            ...definition,
            exists: Boolean(page),
            title: page?.title || definition.label,
            metaTitle: page?.metaTitle || "",
            metaDescription: page?.metaDescription || "",
            isPublished: page?.isPublished ?? false,
          };
        }),
      },
    };
  } catch (error) {
    return { success: false, message: error.message || "SEO settings could not be loaded." };
  }
}

export async function updateGlobalSeoSettings(formData) {
  try {
    await requireProcurementPermission("seoSettings", "update");
    const seoTitle = clean(formData.get("seoTitle"));
    const seoDescription = clean(formData.get("seoDescription"));
    const seoKeywords = clean(formData.get("seoKeywords")).split(/[\n,]/).map((word) => word.trim()).filter(Boolean).join(", ");
    const hasGoogleSiteVerification = formData.has("googleSiteVerification");
    const googleSiteVerification = normalizeGoogleSiteVerification(formData.get("googleSiteVerification"));
    if (seoTitle.length > 160) throw new Error("SEO title cannot exceed 160 characters.");
    if (seoDescription.length > 320) throw new Error("SEO description cannot exceed 320 characters.");
    if (seoKeywords.length > 500) throw new Error("SEO keywords cannot exceed 500 characters.");
    if (googleSiteVerification.length > 200) throw new Error("Google verification code cannot exceed 200 characters.");

    const setting = await prisma.siteSetting.findFirst({ select: { id: true } });
    const data = {
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
      seoKeywords: seoKeywords || null,
      ...(hasGoogleSiteVerification && { googleSiteVerification: googleSiteVerification || null }),
    };
    if (setting) await prisma.siteSetting.update({ where: { id: setting.id }, data });
    else await prisma.siteSetting.create({ data });

    revalidateTag("site-setting");
    revalidatePath("/", "layout");
    revalidatePath("/admin/seo");
    return { success: true, message: "Global SEO settings saved." };
  } catch (error) {
    return { success: false, message: error.message || "Global SEO settings could not be saved." };
  }
}

export async function updateContentPageSeo(formData) {
  try {
    const userId = await requireProcurementPermission("seoSettings", "update");
    const slug = clean(formData.get("slug"));
    const definition = EDITABLE_SEO_PAGES.find((page) => page.slug === slug);
    if (!definition) throw new Error("Choose a valid content page.");
    const metaTitle = clean(formData.get("metaTitle"));
    const metaDescription = clean(formData.get("metaDescription"));
    if (metaTitle.length > 160) throw new Error("SEO title cannot exceed 160 characters.");
    if (metaDescription.length > 320) throw new Error("SEO description cannot exceed 320 characters.");
    const page = await prisma.contentPage.findUnique({ where: { slug }, select: { id: true } });
    if (!page) throw new Error("Save this content page once before setting its SEO fields.");
    await prisma.contentPage.update({
      where: { id: page.id },
      data: { metaTitle: metaTitle || null, metaDescription: metaDescription || null, updatedBy: userId },
    });
    revalidateTag("content-pages");
    revalidatePath(definition.path);
    revalidatePath("/admin/seo");
    return { success: true, message: `${definition.label} SEO saved.` };
  } catch (error) {
    return { success: false, message: error.message || "Page SEO could not be saved." };
  }
}
