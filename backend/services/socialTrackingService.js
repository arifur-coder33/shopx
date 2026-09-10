import {
  decryptProviderCredentials,
  encryptProviderCredentials,
} from "@/backend/services/providerCredentialService";
import prisma from "@/lib/prisma";
import { unstable_cache } from "next/cache";

export const SOCIAL_TRACKING_SETTING_ID = "SOCIAL_TRACKING";

export const SOCIAL_SECRET_FIELDS = [
  "facebookAccessToken",
  "facebookTestEventCode",
  "googleAnalyticsSecret",
  "tiktokAccessToken",
];

const EMPTY_PUBLIC_SETTINGS = Object.freeze({
  facebookPixelId: "",
  googleTagId: "",
  googleAnalyticsId: "",
  tiktokPixelId: "",
});

const clean = (value) => (value == null ? "" : String(value).trim());

const toPublicSettings = (record) => ({
  facebookPixelId: clean(record?.facebookPixelId),
  googleTagId: clean(record?.googleTagId),
  googleAnalyticsId: clean(record?.googleAnalyticsId),
  tiktokPixelId: clean(record?.tiktokPixelId),
});

async function queryPublicSettings() {
  const record = await prisma.socialTrackingSetting.findUnique({
    where: { id: SOCIAL_TRACKING_SETTING_ID },
    select: {
      facebookPixelId: true,
      googleTagId: true,
      googleAnalyticsId: true,
      tiktokPixelId: true,
    },
  });
  return record ? toPublicSettings(record) : { ...EMPTY_PUBLIC_SETTINGS };
}

const readCachedPublicSettings = unstable_cache(
  queryPublicSettings,
  ["social-tracking-public-settings"],
  { revalidate: 300, tags: ["social-tracking"] },
);

// Only non-secret IDs are cached and passed to storefront components.
export async function getPublicSocialTrackingSettings() {
  if (process.env.NODE_ENV === "development") return queryPublicSettings();
  return readCachedPublicSettings();
}

export async function getSocialTrackingRecord() {
  return prisma.socialTrackingSetting.findUnique({
    where: { id: SOCIAL_TRACKING_SETTING_ID },
  });
}

export function decryptSocialSecrets(payload) {
  if (!payload) return {};
  return decryptProviderCredentials(payload);
}

export function encryptSocialSecrets(secrets) {
  const populated = Object.fromEntries(
    SOCIAL_SECRET_FIELDS.map((key) => [key, clean(secrets[key])]).filter(
      ([, value]) => value,
    ),
  );
  return Object.keys(populated).length
    ? encryptProviderCredentials(populated)
    : null;
}

// Server event senders call this directly. Decrypted values never enter the
// Next.js data cache or a Client Component payload.
export async function getServerSocialTrackingSettings() {
  const record = await getSocialTrackingRecord();
  const secrets = record?.encryptedSecrets
    ? decryptSocialSecrets(record.encryptedSecrets)
    : {};
  return {
    ...toPublicSettings(record),
    facebookAccessToken: clean(secrets.facebookAccessToken),
    facebookTestEventCode: clean(secrets.facebookTestEventCode),
    googleAnalyticsSecret: clean(secrets.googleAnalyticsSecret),
    tiktokAccessToken: clean(secrets.tiktokAccessToken),
  };
}
