import { cache } from "react";
import prisma from "../../lib/prisma.js";
import { normalizeHostname } from "../utils/hostname.js";
import { getDeploymentMode } from "./deploymentModeService.js";

export const DEFAULT_STORE_SLUG = "default";

export async function ensureDefaultStandaloneStore(database = prisma) {
  return database.store.upsert({
    where: { slug: DEFAULT_STORE_SLUG },
    update: {},
    create: {
      name: "Default Store",
      slug: DEFAULT_STORE_SLUG,
      status: "ACTIVE",
    },
  });
}

export async function resolveStoreContext({
  hostname,
  mode = getDeploymentMode(),
  platformDomain = process.env.PLATFORM_DOMAIN,
  database = prisma,
} = {}) {
  if (mode === "STANDALONE") {
    const store = await database.store.findUnique({
      where: { slug: DEFAULT_STORE_SLUG },
    });

    if (!store || store.status !== "ACTIVE") {
      return {
        type: "INVALID_STORE",
        store: null,
        reason: "DEFAULT_STORE_UNAVAILABLE",
      };
    }

    return { type: "STORE", store };
  }

  if (mode !== "SAAS") {
    throw new Error("Store resolution requires SAAS or STANDALONE mode.");
  }

  const normalizedHostname = normalizeHostname(hostname);
  const normalizedPlatformDomain = normalizeHostname(platformDomain);

  if (!normalizedPlatformDomain) {
    return {
      type: "INVALID_STORE",
      store: null,
      reason: "PLATFORM_DOMAIN_NOT_CONFIGURED",
    };
  }
  if (!normalizedHostname) {
    return {
      type: "INVALID_STORE",
      store: null,
      reason: "INVALID_HOSTNAME",
    };
  }
  if (normalizedHostname === normalizedPlatformDomain) {
    return { type: "PLATFORM", store: null };
  }

  const storeDomain = await database.storeDomain.findUnique({
    where: { domain: normalizedHostname },
    include: { store: true },
  });

  if (
    !storeDomain ||
    !storeDomain.isVerified ||
    storeDomain.status !== "ACTIVE" ||
    storeDomain.store?.status !== "ACTIVE"
  ) {
    return {
      type: "INVALID_STORE",
      store: null,
      reason: "STORE_DOMAIN_UNAVAILABLE",
    };
  }

  return { type: "STORE", store: storeDomain.store };
}

const resolveCurrentRequestStoreContext = cache(async () => {
  const { headers } = await import("next/headers");
  const requestHeaders = await headers();
  return resolveStoreContext({ hostname: requestHeaders.get("host") });
});

export function getCurrentStoreContext() {
  return resolveCurrentRequestStoreContext();
}

export async function getCurrentStore() {
  const context = await getCurrentStoreContext();
  return context.type === "STORE" ? context.store : null;
}

export async function getCurrentStoreId() {
  const store = await getCurrentStore();
  return store?.id || null;
}

export async function requireCurrentStoreId() {
  const context = await getCurrentStoreContext();
  if (context.type !== "STORE" || !context.store?.id) {
    throw new Error("A valid Store context is required.");
  }
  return context.store.id;
}
