import {
  decryptProviderCredentials,
  encryptProviderCredentials,
} from "@/backend/services/providerCredentialService";
import prisma from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { requireCurrentStoreId } from "./storeContextService";

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

async function queryPublicSettings(storeId) {
  const record = await prisma.socialTrackingSetting.findUnique({
    where: { storeId },
    select: {
      facebookPixelId: true,
      googleTagId: true,
      googleAnalyticsId: true,
      tiktokPixelId: true,
    },
  });
  return record ? toPublicSettings(record) : { ...EMPTY_PUBLIC_SETTINGS };
}

const readCachedPublicSettings = (storeId) =>
  unstable_cache(
    () => queryPublicSettings(storeId),
    ["social-tracking-public-settings", storeId],
    { revalidate: 300, tags: [`social-tracking:${storeId}`] },
  )();

// Only non-secret IDs are cached and passed to storefront components.
export async function getPublicSocialTrackingSettings() {
  const storeId = await requireCurrentStoreId();
  if (process.env.NODE_ENV === "development") return queryPublicSettings(storeId);
  return readCachedPublicSettings(storeId);
}

export async function getSocialTrackingRecord() {
  const storeId = await requireCurrentStoreId();
  return prisma.socialTrackingSetting.findUnique({
    where: { storeId },
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
