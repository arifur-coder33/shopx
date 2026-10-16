"use server";
import prisma from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { cloudinaryDestroy, cloudinaryUpload } from "../utils/cloudinary";
import { requireProcurementPermission } from "../utils/procurement";
import {
  getCachedSiteSettingRecord,
  normalizeSiteAppearance,
  normalizeSiteIdentity,
} from "../services/siteAppearanceService";

const clean = (value) => String(value || "").trim();
const HEX = /^#[0-9a-f]{6}$/i;
const color = (value, label) => {
  const normalized = clean(value).toLowerCase();
  if (!HEX.test(normalized)) throw new Error(`${label} must be a six-digit hex color.`);
  return normalized;
};
const boundedInteger = (value, label, min, max) => {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new Error(`${label} must be between ${min} and ${max}.`);
  }
  return number;
};
const refreshSiteSetting = () => {
  revalidateTag("site-setting");
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings/site-appearance");
};

export async function getSiteSetting(params) {
  try {
    const data = params
      ? await prisma.siteSetting.findFirst({ ...params })
      : process.env.NODE_ENV === "development"
        ? await prisma.siteSetting.findFirst()
        : await getCachedSiteSettingRecord();

    return { success: true, data: data };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function siteSettingUpdate(formData) {
  await requireProcurementPermission("siteSetting", "update");
  let data = Object.fromEntries(formData.entries());
  let preparedData = {
    ...data,
  };

  // Handle  image
  const singleImage = formData.get("logo");

  const getSetting = await prisma.siteSetting.findFirst();
  if (singleImage && singleImage?.size > 1) {
    const singleUploadedImage = await cloudinaryUpload({
      image: singleImage,
      tag: "logo",
      slug: "site",
      perifix: "_logo",
    });

    preparedData = {
      ...preparedData,
      logo: `${singleUploadedImage.display_name}.${singleUploadedImage.format}`,
    };

    if (getSetting?.logo && getSetting?.logo !== null) {
      await cloudinaryDestroy(getSetting?.logo);
    }
  }

  if (!getSetting) {
    const result = await prisma.siteSetting.create({
      data: preparedData,
    });
    refreshSiteSetting();
    return { success: true, result };
  }
  if (getSetting) {
    const result = await prisma.siteSetting.update({
      where: { id: getSetting?.id },
      data: preparedData,
    });
    refreshSiteSetting();
    return { success: true, result };
  }
}

export async function getSiteAppearanceForAdmin() {
  try {
    await requireProcurementPermission("siteSetting", "view");
    const setting = await prisma.siteSetting.findFirst();
    const mediaNames = [setting?.logo, setting?.favicon].filter(Boolean);
    const media = mediaNames.length
      ? await prisma.media.findMany({
          where: { name: { in: mediaNames } },
          select: { id: true, name: true, url: true },
        })
      : [];
    const byName = new Map(media.map((item) => [item.name, item]));
    return {
      success: true,
      data: {
        ...normalizeSiteAppearance(setting),
        ...normalizeSiteIdentity(setting),
        orderReconfirmEnabled: setting?.orderReconfirmEnabled ?? true,
        orderReconfirmMessage: setting?.orderReconfirmMessage || "অর্ডারটি নিশ্চিত করতে নিচের বাটনে চাপ দিন।",
        logo: setting?.logo || null,
        logoMedia: byName.get(setting?.logo) || null,
        faviconMedia: byName.get(setting?.favicon) || null,
      },
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function updateSiteAppearance(formData) {
  try {
    await requireProcurementPermission("siteSetting", "update");
    const values = Object.fromEntries(formData.entries());
    const existing = await prisma.siteSetting.findFirst({
      select: { id: true, logo: true, favicon: true },
    });
    const siteName = clean(values.siteName);
    if (!siteName || siteName.length > 80) {
      throw new Error("Site name must be between 1 and 80 characters.");
    }
    const seoTitle = clean(values.seoTitle);
    const seoDescription = clean(values.seoDescription);
    if (seoTitle.length > 160) {
      throw new Error("SEO title cannot exceed 160 characters.");
    }
    if (seoDescription.length > 320) {
      throw new Error("SEO description cannot exceed 320 characters.");
    }
    const logoId = clean(values.logo);
    const faviconId = clean(values.favicon);
    const [logoMedia, faviconMedia] = await Promise.all([
      logoId
        ? prisma.media.findUnique({ where: { id: logoId }, select: { name: true } })
        : null,
      faviconId
        ? prisma.media.findUnique({ where: { id: faviconId }, select: { name: true } })
        : null,
    ]);
    if (logoId && !logoMedia) throw new Error("Selected logo image was not found.");
    if (faviconId && !faviconMedia) throw new Error("Selected favicon image was not found.");

    const data = {
      name: siteName,
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
      logo: logoMedia?.name ||
        (values.removeLogo === "true" ? null : existing?.logo || null),
      favicon: faviconMedia?.name ||
        (values.removeFavicon === "true" ? null : existing?.favicon || null),
      primaryColor: color(values.primaryColor, "Primary color"),
      secondaryColor: color(values.secondaryColor, "Secondary color"),
      accentColor: color(values.accentColor, "Accent color"),
      lightBackground: color(values.lightBackground, "Light background"),
      lightSurface: color(values.lightSurface, "Light surface"),
      lightText: color(values.lightText, "Light text"),
      darkBackground: color(values.darkBackground, "Dark background"),
      darkSurface: color(values.darkSurface, "Dark surface"),
      darkText: color(values.darkText, "Dark text"),
      baseFontSize: boundedInteger(values.baseFontSize, "Base font size", 14, 20),
      borderRadius: boundedInteger(values.borderRadius, "Border radius", 0, 24),
      orderReconfirmEnabled: values.orderReconfirmEnabled === "true",
      orderReconfirmMessage: clean(values.orderReconfirmMessage).slice(0, 500) || null,
    };

    if (existing) {
      await prisma.siteSetting.update({ where: { id: existing.id }, data });
    } else {
      await prisma.siteSetting.create({ data });
    }
    refreshSiteSetting();
    return { success: true, message: "Site appearance updated." };
  } catch (error) {
    return { success: false, message: error.message || "Failed to update site appearance." };
  }
}
