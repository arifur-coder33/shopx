import {
  decryptProviderCredentials,
} from "@/backend/services/providerCredentialService";
import prisma from "@/lib/prisma";

const PROVIDERS = ["google", "facebook"];

function credentialsFromRecord(record) {
  if (!record?.isActive || !record.encryptedCredentials) return null;
  try {
    const credentials = decryptProviderCredentials(record.encryptedCredentials);
    const clientId = String(credentials.clientId || "").trim();
    const clientSecret = String(credentials.clientSecret || "").trim();
    return clientId && clientSecret ? { clientId, clientSecret } : null;
  } catch {
    return null;
  }
}

export async function getEnabledSocialAuthProviders() {
  const records = await prisma.socialAuthConfiguration.findMany({
    where: { provider: { in: PROVIDERS }, isActive: true },
    select: { provider: true, isActive: true, encryptedCredentials: true },
  });
  return Object.fromEntries(
    records
      .map((record) => [record.provider, credentialsFromRecord(record)])
      .filter(([, credentials]) => credentials),
  );
}

export async function getSocialAuthAvailability() {
  try {
    const providers = await getEnabledSocialAuthProviders();
    return {
      google: Boolean(providers.google),
      facebook: Boolean(providers.facebook),
    };
  } catch {
    return { google: false, facebook: false };
  }
}
