"use server";

import { randomBytes } from "node:crypto";

import {
  decryptProviderCredentials,
  encryptProviderCredentials,
  extractProviderNonSecretConfig,
  getCourierWebhookSecret as resolveCourierWebhookSecret,
  getProviderAccountType,
  getProviderRuntimeConfiguration,
  getPublicAdapterDefinitions,
  prepareProviderCredentialUpdate,
} from "@/backend/services/providerCredentialService";
import prisma from "@/lib/prisma";
import { getSiteUrl } from "@/lib/siteUrl";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import {
  actionError,
  requireProcurementPermission,
  toNumber,
} from "../utils/procurement";

const PROVIDER_CONFIG = {
  gateway: {
    model: "paymentGateway",
    resource: "provider",
    path: "/admin/settings/payment-gateways",
  },
  courier: {
    model: "courierProvider",
    resource: "provider",
    path: "/admin/settings/couriers",
  },
};

const configFor = (kind) => {
  const config = PROVIDER_CONFIG[kind];
  if (!config) throw new Error("Invalid provider type.");
  return config;
};

const refresh = (path) => {
  revalidatePath(path);
  revalidatePath("/admin/accounts");
  revalidatePath("/checkout");
  revalidatePath("/admin/orders");
  revalidateTag("checkout-providers");
};

const publicProvider = (kind, provider) => {
  const { encryptedCredentials: _encryptedCredentials, ...safeProvider } =
    provider;
  const runtime = getProviderRuntimeConfiguration(kind, provider);
  return {
    ...safeProvider,
    readiness: {
      integrationAvailable: runtime.integrationAvailable,
      credentialsConfigured: runtime.credentialsConfigured,
      moneyAccountConfigured: runtime.moneyAccountConfigured,
      moneyAccountRequired: runtime.moneyAccountRequired,
      supportsCod: runtime.supportsCod,
      ready: runtime.ready,
      credentialSource: runtime.credentialSource,
      hasDatabaseCredentials: runtime.hasDatabaseCredentials,
      error: runtime.error,
    },
  };
};

async function ensureProviderMoneyAccount(
  tx,
  { kind, provider, userId },
) {
  const model = tx[configFor(kind).model];
  const requestedId = provider.moneyAccountId;
  if (requestedId) {
    const account = await tx.moneyAccount.findUnique({
      where: { id: requestedId },
    });
    if (account && !account.isActive) {
      return tx.moneyAccount.update({
        where: { id: account.id },
        data: { isActive: true, updatedBy: userId },
      });
    }
    if (account) return account;
  }

  const accountType = getProviderAccountType(kind, provider.adapterKey);
  const stableAccountNumber = `PROVIDER:${kind.toUpperCase()}:${provider.code}`;
  let account = await tx.moneyAccount.findFirst({
    where: { accountNumber: stableAccountNumber },
  });

  if (!account) {
    const exactMatches = await tx.moneyAccount.findMany({
      where: {
        name: { equals: provider.name, mode: "insensitive" },
        type: accountType,
      },
      take: 2,
    });
    // Reuse only an unambiguous legacy account. If several have the same name,
    // create the deterministic provider account instead of guessing.
    account = exactMatches.length === 1 ? exactMatches[0] : null;
  }

  if (!account) {
    account = await tx.moneyAccount.create({
      data: {
        name: provider.name,
        type: accountType,
        accountNumber: stableAccountNumber,
        isActive: true,
        createdBy: userId,
        updatedBy: userId,
      },
    });
  } else if (!account.isActive) {
    account = await tx.moneyAccount.update({
      where: { id: account.id },
      data: { isActive: true, updatedBy: userId },
    });
  }

  await model.update({
    where: { id: provider.id },
    data: { moneyAccountId: account.id, updatedBy: userId },
  });
  return account;
}

async function queryCheckoutProviders() {
  const gateways = await prisma.paymentGateway.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { moneyAccount: true },
  });
  const readyGateways = gateways.filter(
    (provider) => getProviderRuntimeConfiguration("gateway", provider).ready,
  );
  return {
    codEnabled: readyGateways.some((provider) => provider.adapterKey === "COD"),
    gateways: readyGateways
      .filter((provider) => provider.adapterKey !== "COD")
      .map(({ id, name, code, adapterKey }) => ({
        id,
        name,
        code,
        adapterKey,
      })),
  };
}

const readCheckoutProviders = unstable_cache(
  queryCheckoutProviders,
  ["checkout-providers"],
  { revalidate: 60, tags: ["checkout-providers"] },
);

export async function getCheckoutProviders() {
  try {
    // Next's development filesystem cache can retain a cancelled in-flight
    // render across HMR. Direct reads keep dev navigation reliable; production
    // continues to use the tagged cache below.
    if (process.env.NODE_ENV === "development") {
      return await queryCheckoutProviders();
    }
    return await readCheckoutProviders();
  } catch {
    return { codEnabled: false, gateways: [] };
  }
}

export async function getProviderConfiguration(kind, params = {}) {
  try {
    const config = configFor(kind);
    await requireProcurementPermission(config.resource, "view");
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(50, Math.max(5, Number(params.limit) || 10));
    const status = String(params.status || "ALL");
    const adapterDefinitions = getPublicAdapterDefinitions(kind);
    const supportedAdapters = adapterDefinitions.map((adapter) => adapter.key);
    const where = {
      adapterKey: { in: supportedAdapters },
      ...(params.name && {
        name: { contains: String(params.name), mode: "insensitive" },
      }),
      ...(params.code && {
        code: { contains: String(params.code), mode: "insensitive" },
      }),
      ...(supportedAdapters.includes(String(params.adapterKey).toUpperCase()) && {
        adapterKey: String(params.adapterKey).toUpperCase(),
      }),
      ...(status === "ACTIVE" && { isActive: true }),
      ...(status === "INACTIVE" && { isActive: false }),
    };
    const model = prisma[config.model];
    const [providers, total] = await Promise.all([
      model.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: {
          moneyAccount: true,
          _count: { select: { payments: true, orders: true } },
        },
      }),
      model.count({ where }),
    ]);
    return {
      success: true,
      data: {
        providers: providers.map((provider) => publicProvider(kind, provider)),
        adapters: adapterDefinitions.map((adapter) => adapter.key),
        adapterDefinitions,
        credentialEncryptionReady: Boolean(
          process.env.PROVIDER_CREDENTIAL_ENCRYPTION_KEY?.length >= 32,
        ),
        ...(kind === "courier" && {
          webhookBaseUrl: getSiteUrl(),
        }),
      },
      filters: params,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  } catch (error) {
    return actionError(error, "Failed to load provider configuration.");
  }
}

export async function getCourierWebhookSecret(providerId) {
  try {
    await requireProcurementPermission("provider", "update");
    const provider = await prisma.courierProvider.findUnique({
      where: { id: providerId },
      select: { adapterKey: true, encryptedCredentials: true },
    });
    if (!provider || !["STEADFAST", "PATHAO"].includes(provider.adapterKey)) {
      return { success: false, message: "Courier webhook is unavailable." };
    }
    const value = resolveCourierWebhookSecret(provider);
    return value
      ? { success: true, data: { value, customized: Boolean(decryptProviderCredentials(provider.encryptedCredentials).webhookSecret) } }
      : { success: false, message: "Configure the courier API secret first." };
  } catch (error) {
    return actionError(error, "Failed to load courier webhook secret.");
  }
}

export async function generateCourierWebhookSecret(providerId) {
  try {
    const userId = await requireProcurementPermission("provider", "update");
    const provider = await prisma.courierProvider.findUnique({
      where: { id: providerId },
      select: { adapterKey: true, encryptedCredentials: true },
    });
    if (!provider || !["STEADFAST", "PATHAO"].includes(provider.adapterKey)) {
      return { success: false, message: "Courier webhook is unavailable." };
    }
    if (!process.env.PROVIDER_CREDENTIAL_ENCRYPTION_KEY || process.env.PROVIDER_CREDENTIAL_ENCRYPTION_KEY.length < 32) {
      return { success: false, message: "Configure the provider credential encryption key first." };
    }
    const credentials = provider.encryptedCredentials
      ? decryptProviderCredentials(provider.encryptedCredentials)
      : {};
    const secret = randomBytes(32).toString("base64url");
    await prisma.courierProvider.update({
      where: { id: providerId },
      data: {
        encryptedCredentials: encryptProviderCredentials({ ...credentials, webhookSecret: secret }),
        credentialsUpdatedAt: new Date(),
        updatedBy: userId,
      },
    });
    revalidatePath("/admin/settings/couriers");
    return { success: true, message: "New webhook secret generated and saved.", data: { value: secret, customized: true } };
  } catch (error) {
    return actionError(error, "Failed to generate courier webhook secret.");
  }
}

export async function revealProviderCredential(kind, providerId, fieldKey) {
  try {
    const config = configFor(kind);
    await requireProcurementPermission(config.resource, "update");
    const provider = await prisma[config.model].findUnique({
      where: { id: providerId },
      select: { adapterKey: true, encryptedCredentials: true },
    });
    if (!provider) {
      return { success: false, message: "Provider configuration not found." };
    }
    const definition = getPublicAdapterDefinitions(kind).find(
      (adapter) => adapter.key === provider.adapterKey,
    );
    if (
      !definition?.credentialFields.some((field) => field.key === fieldKey)
    ) {
      return { success: false, message: "Invalid credential field." };
    }
    if (!provider.encryptedCredentials) {
      return { success: false, message: "This credential has not been saved yet." };
    }
    const credentials = decryptProviderCredentials(
      provider.encryptedCredentials,
    );
    const value = credentials[fieldKey];
    if (value === undefined || value === null || String(value) === "") {
      return { success: false, message: "This credential has not been saved yet." };
    }
    return { success: true, data: { value: String(value) } };
  } catch (error) {
    return actionError(error, "Failed to reveal provider credential.");
  }
}

export async function saveProviderConfiguration(kind, formData) {
  try {
    const config = configFor(kind);
    const values = Object.fromEntries(formData.entries());
    const userId = await requireProcurementPermission(config.resource, "update");
    if (!values.id) {
      return {
        success: false,
        message: "Providers are registered in code and cannot be created from the admin UI.",
      };
    }
    const model = prisma[config.model];
    const existing = await model.findUnique({ where: { id: values.id } });
    if (!existing) {
      return { success: false, message: "Provider not found." };
    }
    const definition = getPublicAdapterDefinitions(kind).find(
      (adapter) => adapter.key === existing.adapterKey,
    );
    if (!definition || definition.code !== existing.code) {
      return {
        success: false,
        message: "This provider is not registered by the current server code.",
      };
    }
    const name = String(values.name || existing.name).trim();
    const code = existing.code;
    const adapterKey = existing.adapterKey;
    const sortOrder = Math.trunc(toNumber(values.sortOrder, existing.sortOrder));
    const isActive = values.isActive === "true";
    if (!name) return { success: false, message: "Display name is required." };
    const credentialUpdate = prepareProviderCredentialUpdate({
      kind,
      adapterKey,
      previousAdapterKey: existing.adapterKey,
      existingEncryptedCredentials: existing.encryptedCredentials,
      values,
    });
    const nonSecretConfig = extractProviderNonSecretConfig(
      kind,
      adapterKey,
      values,
    );
    const candidate = {
      ...existing,
      name,
      code,
      adapterKey,
      isActive,
      encryptedCredentials: credentialUpdate.encryptedCredentials,
      nonSecretConfig,
    };
    const readiness = getProviderRuntimeConfiguration(kind, candidate);
    if (isActive && !readiness.integrationAvailable) {
      return {
        success: false,
        message: "This provider has no implemented server integration adapter.",
      };
    }
    if (isActive && !readiness.credentialsConfigured) {
      return {
        success: false,
        message:
          "Configure all required provider credentials before enabling this provider.",
      };
    }

    const provider = await prisma.$transaction(async (tx) => {
      const txModel = tx[config.model];
      const baseData = {
        name,
        code,
        adapterKey,
        sortOrder,
        isActive: false,
        moneyAccountId: existing.moneyAccountId,
        encryptedCredentials: credentialUpdate.encryptedCredentials,
        nonSecretConfig,
        ...(credentialUpdate.changed && {
          credentialsUpdatedAt: new Date(),
          credentialVersion: 1,
        }),
        updatedBy: userId,
      };
      let saved = await txModel.update({
        where: { id: existing.id },
        data: baseData,
      });

      if (isActive && readiness.moneyAccountRequired) {
        const account = await ensureProviderMoneyAccount(tx, {
          kind,
          provider: saved,
          userId,
        });
        saved = await txModel.update({
          where: { id: saved.id },
          data: {
            isActive: true,
            moneyAccountId: account.id,
            updatedBy: userId,
          },
        });
      } else if (isActive) {
        saved = await txModel.update({
          where: { id: saved.id },
          data: { isActive: true, updatedBy: userId },
        });
      }
      return saved;
    });

    refresh(config.path);
    return {
      success: true,
      message: `${kind === "gateway" ? "Payment gateway" : "Courier"} updated${isActive ? " and enabled" : ""}.`,
      data: publicProvider(kind, provider),
    };
  } catch (error) {
    return actionError(error, "Failed to save provider configuration.");
  }
}
