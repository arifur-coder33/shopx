import prisma from "@/lib/prisma";
import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
import { unstable_cache } from "next/cache";
import { requireCurrentStoreId } from "./storeContextService";

export const SITE_APPEARANCE_DEFAULTS = Object.freeze({
  primaryColor: "#ea580c",
  secondaryColor: "#7c3aed",
  accentColor: "#0f766e",
  lightBackground: "#f8fafc",
  lightSurface: "#ffffff",
  lightText: "#172033",
  darkBackground: "#0b1220",
  darkSurface: "#111b2e",
  darkText: "#e8eef8",
  baseFontSize: 16,
  borderRadius: 12,
});

const HEX = /^#[0-9a-f]{6}$/i;
const safeColor = (value, fallback) =>
  HEX.test(String(value || "")) ? String(value).toLowerCase() : fallback;
const safeNumber = (value, fallback, min, max) => {
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.min(max, Math.max(min, Math.round(number)))
    : fallback;
};

export function normalizeSiteAppearance(setting) {
  const defaults = SITE_APPEARANCE_DEFAULTS;
  return {
    primaryColor: safeColor(setting?.primaryColor, defaults.primaryColor),
    secondaryColor: safeColor(setting?.secondaryColor, defaults.secondaryColor),
    accentColor: safeColor(setting?.accentColor, defaults.accentColor),
    lightBackground: safeColor(setting?.lightBackground, defaults.lightBackground),
    lightSurface: safeColor(setting?.lightSurface, defaults.lightSurface),
    lightText: safeColor(setting?.lightText, defaults.lightText),
    darkBackground: safeColor(setting?.darkBackground, defaults.darkBackground),
    darkSurface: safeColor(setting?.darkSurface, defaults.darkSurface),
    darkText: safeColor(setting?.darkText, defaults.darkText),
    baseFontSize: safeNumber(setting?.baseFontSize, defaults.baseFontSize, 14, 20),
    borderRadius: safeNumber(setting?.borderRadius, defaults.borderRadius, 0, 24),
  };
}

export function normalizeSiteIdentity(setting) {
  const name = String(setting?.name || "").trim() || "Shop";
  const seoTitle = String(setting?.seoTitle || "").trim() || name;
  const seoDescription =
    String(setting?.seoDescription || "").trim() ||
    "ঘরে বসে সহজে আপনার পছন্দের পণ্য অর্ডার করুন।";
  return {
    name,
    seoTitle,
    seoDescription,
    logo: setting?.logo || null,
    logoUrl: setting?.logo
      ? cloudinaryMainImage(setting.logo, 512, 512)
      : null,
    favicon: setting?.favicon || null,
    faviconUrl: setting?.favicon
      ? cloudinaryMainImage(setting.favicon, 64, 64)
      : "/favicon-32x32.png",
  };
}

const querySiteSetting = (storeId) =>
  prisma.siteSetting.findUnique({ where: { storeId } });

export async function getCachedSiteSettingRecord() {
  const storeId = await requireCurrentStoreId();
  return unstable_cache(
    () => querySiteSetting(storeId),
    ["site-setting", storeId],
    { revalidate: 300, tags: [`site-setting:${storeId}`] },
  )();
}

export async function getPublicSiteAppearance() {
  const storeId = await requireCurrentStoreId();
  const setting =
    process.env.NODE_ENV === "development"
      ? await querySiteSetting(storeId)
      : await getCachedSiteSettingRecord();
  return normalizeSiteAppearance(setting);
}

export async function getPublicSiteIdentity() {
  const storeId = await requireCurrentStoreId();
  const setting =
    process.env.NODE_ENV === "development"
      ? await querySiteSetting(storeId)
      : await getCachedSiteSettingRecord();
  return normalizeSiteIdentity(setting);
}

// Values reaching this CSS are normalized to six-digit hex colors and bounded
// integers, preventing stored configuration from injecting arbitrary markup.
export function createSiteAppearanceCss(appearance) {
  const value = normalizeSiteAppearance(appearance);
  return `
    html:root {
      --brand-primary: ${value.primaryColor};
      --brand-primary-hover: color-mix(in srgb, ${value.primaryColor} 82%, #000000);
      --brand-primary-soft: color-mix(in srgb, ${value.primaryColor} 13%, ${value.lightSurface});
      --brand-secondary: ${value.secondaryColor};
      --brand-accent: ${value.accentColor};
      --brand-background: ${value.lightBackground};
      --brand-surface: ${value.lightSurface};
      --brand-surface-muted: color-mix(in srgb, ${value.lightText} 7%, ${value.lightSurface});
      --brand-text: ${value.lightText};
      --brand-text-muted: color-mix(in srgb, ${value.lightText} 62%, ${value.lightBackground});
      --brand-border: color-mix(in srgb, ${value.lightText} 15%, ${value.lightSurface});
      --brand-radius: ${value.borderRadius}px;
      font-size: ${value.baseFontSize}px;
    }
    html.dark {
      --brand-primary: ${value.primaryColor};
      --brand-primary-hover: color-mix(in srgb, ${value.primaryColor} 78%, #ffffff);
      --brand-primary-soft: color-mix(in srgb, ${value.primaryColor} 22%, ${value.darkSurface});
      --brand-secondary: ${value.secondaryColor};
      --brand-accent: ${value.accentColor};
      --brand-background: ${value.darkBackground};
      --brand-surface: ${value.darkSurface};
      --brand-surface-muted: color-mix(in srgb, ${value.darkText} 8%, ${value.darkSurface});
      --brand-text: ${value.darkText};
      --brand-text-muted: color-mix(in srgb, ${value.darkText} 64%, ${value.darkBackground});
      --brand-border: color-mix(in srgb, ${value.darkText} 16%, ${value.darkSurface});
    }
  `;
}
