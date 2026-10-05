"use server";

import {
  decryptProviderCredentials,
  encryptProviderCredentials,
} from "@/backend/services/providerCredentialService";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireProcurementPermission } from "../utils/procurement";

const PROVIDERS = new Set(["google", "facebook"]);
const clean = (value) => String(value ?? "").trim();

export async function getSocialAuthSettings() {
  try {
    await requireProcurementPermission("siteSetting", "view");
    const records = await prisma.socialAuthConfiguration.findMany({
      where: { provider: { in: [...PROVIDERS] } },
      select: { provider: true, isActive: true, encryptedCredentials: true },
    });
    const data = Object.fromEntries(
      ["google", "facebook"].map((provider) => {
        const record = records.find((item) => item.provider === provider);
        let credentials = {};
        if (record?.encryptedCredentials) {
          try {
            credentials = decryptProviderCredentials(record.encryptedCredentials);
          } catch {
            credentials = {};
          }
        }
        return [provider, {
          isActive: Boolean(record?.isActive),
          clientId: clean(credentials.clientId),
          clientSecretConfigured: Boolean(clean(credentials.clientSecret)),
        }];
      }),
    );
    return {
      success: true,
      data,
      encryptionReady: Boolean(
        process.env.PROVIDER_CREDENTIAL_ENCRYPTION_KEY?.length >= 32,
      ),
    };
  } catch (error) {
    return { success: false, message: error.message || "Failed to load social login settings." };
  }
}

export async function saveSocialAuthProvider(formData) {
  try {
    await requireProcurementPermission("siteSetting", "update");
    const values = Object.fromEntries(formData.entries());
    const provider = clean(values.provider).toLowerCase();
    if (!PROVIDERS.has(provider)) throw new Error("Invalid social login provider.");

    const existing = await prisma.socialAuthConfiguration.findUnique({
      where: { provider },
    });
    let previous = {};
    if (existing?.encryptedCredentials) {
      previous = decryptProviderCredentials(existing.encryptedCredentials);
    }

    const clearCredentials = values.clearCredentials === "true";
    const credentials = clearCredentials
      ? {}
      : {
          clientId: clean(values.clientId) || clean(previous.clientId),
          clientSecret: clean(values.clientSecret) || clean(previous.clientSecret),
        };
    const isActive = values.isActive === "true";
    if (isActive && (!credentials.clientId || !credentials.clientSecret)) {
      throw new Error("Enter both Client ID and Client Secret before enabling this provider.");
    }

    const hasCredentials = Boolean(credentials.clientId || credentials.clientSecret);
    const changed =
      clearCredentials ||
      credentials.clientId !== clean(previous.clientId) ||
      credentials.clientSecret !== clean(previous.clientSecret);
    const encryptedCredentials = !hasCredentials
      ? null
      : changed || !existing?.encryptedCredentials
        ? encryptProviderCredentials(credentials)
        : existing.encryptedCredentials;

    await prisma.socialAuthConfiguration.upsert({
      where: { provider },
      update: {
        isActive,
        encryptedCredentials,
      },
      create: {
        provider,
        isActive,
        encryptedCredentials,
      },
    });

    revalidatePath("/login");
    revalidatePath("/my-account");
    revalidatePath("/admin/settings/social-login");
    return {
      success: true,
      message: `${provider === "google" ? "Google" : "Facebook"} login settings saved.`,
    };
  } catch (error) {
    return { success: false, message: error.message || "Failed to save social login settings." };
  }
}
