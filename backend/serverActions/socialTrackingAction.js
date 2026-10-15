"use server";

import {
  decryptSocialSecrets,
  encryptSocialSecrets,
  getSocialTrackingRecord,
  SOCIAL_SECRET_FIELDS,
  SOCIAL_TRACKING_SETTING_ID,
} from "@/backend/services/socialTrackingService";
import { actionError, requireProcurementPermission } from "@/backend/utils/procurement";
import prisma from "@/lib/prisma";
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
    const record = await getSocialTrackingRecord();
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
        encryptedSecrets,
        ...(secretsChanged && { secretsUpdatedAt: new Date() }),
        updatedBy: userId,
      },
      create: {
        id: SOCIAL_TRACKING_SETTING_ID,
        ...publicData,
        encryptedSecrets,
        ...(encryptedSecrets && { secretsUpdatedAt: new Date() }),
        createdBy: userId,
        updatedBy: userId,
      },
    });

    revalidateTag("social-tracking");
    revalidatePath("/", "layout");
    revalidatePath("/admin/settings/social-tracking");
    return { success: true, message: "Social tracking settings updated." };
  } catch (error) {
    return actionError(error, "Failed to update social tracking settings.");
  }
}
