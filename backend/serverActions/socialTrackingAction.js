"use server";

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import {
  decryptSocialSecrets,
  encryptSocialSecrets,
  getSocialTrackingRecord,
  SOCIAL_SECRET_FIELDS,
  SOCIAL_TRACKING_SETTING_ID,
} from "@/backend/services/socialTrackingService";
import { actionError, requireProcurementPermission } from "@/backend/utils/procurement";
import prisma from "@/lib/prisma";
import { normalizeGoogleSiteVerification } from "@/backend/services/siteAppearanceService";
import { revalidatePath, revalidateTag } from "next/cache";

const PUBLIC_FIELDS = [
  "facebookPixelId",
  "googleTagId",
  "googleAnalyticsId",
  "googleAnalyticsPropertyId",
  "clarityProjectId",
  "tiktokPixelId",
];

const clean = (value) => (value == null ? "" : String(value).trim());

const validatePublicId = (value, label) => {
  const normalized = clean(value);
  if (normalized && !/^[A-Za-z0-9._-]+$/.test(normalized)) {
    throw new Error(`${label} contains invalid characters.`);
  }
  return normalized || null;
};

const validateGaPropertyId = (value) => {
  const normalized = clean(value);
  if (normalized && !/^[0-9]+$/.test(normalized)) {
    throw new Error("GA4 Property ID must contain only digits.");
  }
  return normalized || null;
};

export async function getSocialTrackingConfiguration() {
  try {
    await requireProcurementPermission("socialTracking", "view");
    const [record, siteSetting] = await Promise.all([
      getSocialTrackingRecord(),
      prisma.siteSetting.findFirst({ select: { googleSiteVerification: true } }),
    ]);
    const settings = Object.fromEntries(
      PUBLIC_FIELDS.map((key) => [key, clean(record?.[key])]),
    );
    const savedSecrets = record?.encryptedSecrets
      ? decryptSocialSecrets(record.encryptedSecrets)
      : {};
    return {
      success: true,
      data: {
        ...settings,
        googleSiteVerification: normalizeGoogleSiteVerification(siteSetting?.googleSiteVerification),
        productFeedUsername: clean(record?.productFeedUsername),
        productFeedCredentialsConfigured: Boolean(record?.productFeedUsername && record?.productFeedPasswordHash),
        configuredSecrets: Object.fromEntries(
          SOCIAL_SECRET_FIELDS.map((key) => [key, Boolean(clean(savedSecrets[key]))]),
        ),
        encryptionReady: Boolean(
          process.env.PROVIDER_CREDENTIAL_ENCRYPTION_KEY?.length >= 32,
        ),
      },
    };
  } catch (error) {
    return actionError(error, "Failed to load social tracking settings.");
  }
}

export async function revealSocialTrackingSecret(fieldKey) {
  try {
    await requireProcurementPermission("socialTracking", "update");
    if (!SOCIAL_SECRET_FIELDS.includes(fieldKey)) {
      return { success: false, message: "Invalid secret field." };
    }
    const record = await getSocialTrackingRecord();
    const secrets = record?.encryptedSecrets
      ? decryptSocialSecrets(record.encryptedSecrets)
      : {};
    const value = clean(secrets[fieldKey]);
    return value
      ? { success: true, data: { value } }
      : { success: false, message: "This value has not been saved yet." };
  } catch (error) {
    return actionError(error, "Failed to reveal this secret.");
  }
}

export async function saveSocialTrackingConfiguration(formData) {
  try {
    const userId = await requireProcurementPermission("socialTracking", "update");
    const values = Object.fromEntries(formData.entries());
    const existing = await getSocialTrackingRecord();
    const previousSecrets = existing?.encryptedSecrets
      ? decryptSocialSecrets(existing.encryptedSecrets)
      : {};
    const nextSecrets = { ...previousSecrets };

    for (const key of SOCIAL_SECRET_FIELDS) {
      if (values[`clear_${key}`] === "true") delete nextSecrets[key];
      else if (clean(values[key])) nextSecrets[key] = clean(values[key]);
    }

    const publicData = {
      facebookPixelId: validatePublicId(values.facebookPixelId, "Facebook Pixel ID"),
      googleTagId: validatePublicId(values.googleTagId, "Google Tag Manager ID"),
      googleAnalyticsId: validatePublicId(values.googleAnalyticsId, "Google Analytics ID"),
      googleAnalyticsPropertyId: validateGaPropertyId(values.googleAnalyticsPropertyId),
      clarityProjectId: validatePublicId(values.clarityProjectId, "Clarity Project ID"),
      tiktokPixelId: validatePublicId(values.tiktokPixelId, "TikTok Pixel ID"),
    };
    const googleSiteVerification = normalizeGoogleSiteVerification(values.googleSiteVerification);
    if (googleSiteVerification.length > 200) throw new Error("Google verification code cannot exceed 200 characters.");
    const productFeedUsername = clean(values.productFeedUsername);
    const productFeedPassword = clean(values.productFeedPassword);
    let productFeedPasswordHash = existing?.productFeedPasswordHash || null;
    if (productFeedUsername && !/^[A-Za-z0-9._-]{3,64}$/u.test(productFeedUsername)) {
      throw new Error("Product feed username 3–64 characters হতে হবে (letters, numbers, ., _, -)।");
    }
    if (!productFeedUsername && (productFeedPassword || productFeedPasswordHash)) {
      throw new Error("Password ব্যবহার করতে product feed username-ও দিতে হবে।");
    }
    if (!productFeedUsername && !productFeedPasswordHash) {
      // Leave feeds closed until credentials are created.
    } else if (!productFeedUsername) {
      throw new Error("Product feed username খালি রাখা যাবে না।");
    }
    if (productFeedPassword) {
      if (productFeedPassword.length < 12 || productFeedPassword.length > 128) {
        throw new Error("Product feed password 12–128 characters হতে হবে।");
      }
      productFeedPasswordHash = await bcrypt.hash(productFeedPassword, 12);
    }
    if (productFeedUsername && !productFeedPasswordHash) throw new Error("Product feed-এর জন্য password সেট করুন বা generate করুন।");
    const serviceAccountJson = clean(nextSecrets.googleAnalyticsServiceAccountJson);
    if (serviceAccountJson) {
      let serviceAccount;
      try {
        serviceAccount = JSON.parse(serviceAccountJson);
      } catch {
        throw new Error("GA4 service account key must be valid JSON.");
      }
      if (!serviceAccount.client_email || !serviceAccount.private_key) {
        throw new Error("GA4 service account JSON must include client_email and private_key.");
      }
    }
    const secretsChanged = SOCIAL_SECRET_FIELDS.some(
      (key) => clean(previousSecrets[key]) !== clean(nextSecrets[key]),
    );
    const encryptedSecrets =
      secretsChanged || !existing
        ? encryptSocialSecrets(nextSecrets)
        : existing.encryptedSecrets;

    await prisma.socialTrackingSetting.upsert({
      where: { id: SOCIAL_TRACKING_SETTING_ID },
      update: {
        ...publicData,
        productFeedUsername,
        productFeedPasswordHash,
        encryptedSecrets,
        ...(secretsChanged && { secretsUpdatedAt: new Date() }),
        updatedBy: userId,
      },
      create: {
        id: SOCIAL_TRACKING_SETTING_ID,
        ...publicData,
        productFeedUsername,
        productFeedPasswordHash,
        encryptedSecrets,
        ...(encryptedSecrets && { secretsUpdatedAt: new Date() }),
        createdBy: userId,
        updatedBy: userId,
      },
    });

    const siteSetting = await prisma.siteSetting.findFirst({ select: { id: true } });
    if (siteSetting) {
      await prisma.siteSetting.update({ where: { id: siteSetting.id }, data: { googleSiteVerification: googleSiteVerification || null } });
    } else {
      await prisma.siteSetting.create({ data: { googleSiteVerification: googleSiteVerification || null } });
    }

    revalidateTag("social-tracking");
    revalidateTag("site-setting");
    revalidatePath("/", "layout");
    revalidatePath("/admin/settings/social-tracking");
    return { success: true, message: "Social tracking settings updated." };
  } catch (error) {
    return actionError(error, "Failed to update social tracking settings.");
  }
}

export async function generateProductFeedCredentials() {
  try {
    const userId = await requireProcurementPermission("socialTracking", "update");
    const username = `catalog_${randomBytes(6).toString("hex")}`;
    const password = randomBytes(24).toString("base64url");
    const productFeedPasswordHash = await bcrypt.hash(password, 12);
    await prisma.socialTrackingSetting.upsert({
      where: { id: SOCIAL_TRACKING_SETTING_ID },
      update: { productFeedUsername: username, productFeedPasswordHash, updatedBy: userId },
      create: { id: SOCIAL_TRACKING_SETTING_ID, productFeedUsername: username, productFeedPasswordHash, createdBy: userId, updatedBy: userId },
    });
    revalidatePath("/admin/settings/social-tracking");
    return { success: true, message: "নতুন feed login তৈরি হয়েছে। Password এখনই কপি করে রাখুন।", data: { username, password } };
  } catch (error) {
    return actionError(error, "Product feed credentials generate করা যায়নি।");
  }
}
