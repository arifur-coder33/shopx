import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { getProviderEndpointConfiguration } from "../config/providerEndpoints.js";

const COURIER_RATE_CONFIG = [
  { key: "insideDhakaCharge", label: "Inside Dhaka charge", type: "number", defaultValue: "" },
  { key: "outsideDhakaCharge", label: "Outside Dhaka charge", type: "number", defaultValue: "" },
  { key: "additionalKgCharge", label: "Charge per additional kg", type: "number", defaultValue: "" },
];

const DEFINITIONS = {
  gateway: {
    COD: {
      label: "Cash on Delivery",
      code: "COD",
      integrationAvailable: true,
      accountPolicy: "NEVER",
      accountType: null,
      credentials: [],
      config: [],
    },
    SSLCOMMERZ: {
      label: "SSLCommerz",
      code: "SSLCOMMERZ",
      integrationAvailable: true,
      accountPolicy: "ALWAYS",
      accountType: "PAYMENT_GATEWAY",
      credentials: [
        { key: "storeId", label: "Store ID", secret: false },
        {
          key: "storePassword",
          label: "Store password",
          secret: true,
        },
      ],
      config: [
        {
          key: "isLive",
          label: "Environment",
          type: "boolean",
          defaultValue: "false",
          trueLabel: "Live",
          falseLabel: "Sandbox",
        },
      ],
    },
    BANGLA_QR: {
      label: "Bangla QR",
      code: "BANGLA_QR",
      integrationAvailable: true,
      accountPolicy: "ALWAYS",
      accountType: "PAYMENT_GATEWAY",
      credentials: [],
      config: [
        { key: "qrImageMediaId", label: "Bangla QR image", type: "media", required: true, defaultValue: "" },
        { key: "bankName", label: "Bank / MFS name", type: "text", required: true, defaultValue: "" },
        { key: "bankType", label: "Institution type", type: "select", required: true, defaultValue: "BANK", options: [{ value: "BANK", label: "Bank" }, { value: "MFS", label: "Mobile Financial Service (MFS)" }] },
        { key: "qrImageUrl", label: "QR image URL", type: "derived", required: true, defaultValue: "" },
        { key: "merchantNumber", label: "Merchant account / number", type: "text", required: false, defaultValue: "" },
        { key: "instructions", label: "Customer payment instructions", type: "text", defaultValue: "Bangla QR দিয়ে পেমেন্ট করে TrxID জমা দিন। Admin যাচাই করে payment confirm করবেন।" },
      ],
    },
    BKASH: {
      label: "bKash",
      code: "BKASH",
      integrationAvailable: true,
      accountPolicy: "ALWAYS",
      accountType: "PAYMENT_GATEWAY",
      credentials: [
        { key: "appKey", label: "App key", secret: true },
        { key: "appSecret", label: "App secret", secret: true },
        { key: "username", label: "Username", secret: false },
        { key: "password", label: "Password", secret: true },
      ],
      config: [
        {
          key: "isLive",
          label: "Environment",
          type: "boolean",
          defaultValue: "false",
          trueLabel: "Live",
          falseLabel: "Sandbox",
        },
      ],
      runtimeRequiredConfig: ["baseUrl"],
    },
    NAGAD: {
      label: "Nagad",
      code: "NAGAD",
      integrationAvailable: true,
      accountPolicy: "ALWAYS",
      accountType: "PAYMENT_GATEWAY",
      credentials: [
        { key: "merchantId", label: "Merchant ID", secret: false },
        {
          key: "merchantNumber",
          label: "Merchant mobile number (optional)",
          secret: false,
          required: false,
        },
        { key: "merchantPrivateKey", label: "Merchant RSA private key", secret: true },
        { key: "nagadPublicKey", label: "Nagad gateway RSA public key", secret: true },
      ],
      config: [
        {
          key: "isLive",
          label: "Environment",
          type: "boolean",
          defaultValue: "false",
          trueLabel: "Live",
          falseLabel: "Sandbox",
        },
        {
          key: "clientIp",
          label: "Merchant server IPv4",
          type: "text",
          required: true,
          defaultValue: "",
        },
        {
          key: "apiVersion",
          label: "API version",
          type: "text",
          required: true,
          defaultValue: "v-0.2.0",
        },
      ],
      runtimeRequiredConfig: ["baseUrl"],
    },
    ROCKET: {
      label: "Rocket / DBBL Nexus",
      code: "ROCKET",
      integrationAvailable: false,
      availabilityMessage:
        "Official DBBL merchant WSDL/integration pack is required before the Rocket adapter can be enabled.",
      accountPolicy: "ALWAYS",
      accountType: "PAYMENT_GATEWAY",
      credentials: [],
      config: [],
    },
  },
  courier: {
    MANUAL: {
      // Internal adapter shared by custom courier companies without an API.
      // There is no built-in, generic Manual Delivery provider record.
      label: "Manual courier",
      code: "MANUAL",
      integrationAvailable: true,
      accountPolicy: "WHEN_COD",
      accountType: "COURIER",
      credentials: [],
      config: [
        { key: "merchantId", label: "Merchant ID", type: "text", required: false, defaultValue: "" },
        {
          key: "supportsCod",
          label: "COD collection available",
          type: "boolean",
          defaultValue: "true",
          trueLabel: "Yes",
          falseLabel: "No",
        },
        ...COURIER_RATE_CONFIG,
      ],
    },
    STEADFAST: {
      label: "SteadFast",
      code: "STEADFAST",
      integrationAvailable: true,
      accountPolicy: "WHEN_COD",
      accountType: "COURIER",
      credentials: [
        { key: "apiKey", label: "API key", secret: true },
        {
          key: "secretKey",
          label: "Secret key",
          secret: true,
        },
      ],
      config: [
        {
          key: "supportsCod",
          label: "COD collection available",
          type: "boolean",
          defaultValue: "true",
          trueLabel: "Yes",
          falseLabel: "No",
        },
        ...COURIER_RATE_CONFIG,
      ],
    },
    PATHAO: {
      label: "Pathao",
      code: "PATHAO",
      integrationAvailable: true,
      accountPolicy: "WHEN_COD",
      accountType: "COURIER",
      credentials: [
        { key: "clientId", label: "Client ID", secret: false },
        {
          key: "clientSecret",
          label: "Client secret",
          secret: true,
        },
        { key: "username", label: "Username", secret: false },
        { key: "password", label: "Password", secret: true },
      ],
      config: [
        {
          key: "supportsCod",
          label: "COD collection available",
          type: "boolean",
          defaultValue: "true",
          trueLabel: "Yes",
          falseLabel: "No",
        },
        {
          key: "isLive",
          label: "Environment",
          type: "boolean",
          defaultValue: "false",
          trueLabel: "Live",
          falseLabel: "Sandbox",
        },
        ...COURIER_RATE_CONFIG,
      ],
    },
  },
};

const definitionFor = (kind, adapterKey) =>
  DEFINITIONS[kind]?.[String(adapterKey || "MANUAL").toUpperCase()] || null;

const encryptionKey = () => {
  const raw = process.env.PROVIDER_CREDENTIAL_ENCRYPTION_KEY;
  if (!raw || raw.length < 32) {
    throw new Error(
      "PROVIDER_CREDENTIAL_ENCRYPTION_KEY must be configured with at least 32 characters.",
    );
  }
  return createHash("sha256").update(raw, "utf8").digest();
};

export function encryptProviderCredentials(credentials) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(credentials), "utf8"),
    cipher.final(),
  ]);
  return JSON.stringify({
    v: 1,
    alg: "A256GCM",
    iv: iv.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
    data: encrypted.toString("base64url"),
  });
}

export function decryptProviderCredentials(payload) {
  if (!payload) return {};
  const envelope = JSON.parse(payload);
  if (envelope.v !== 1 || envelope.alg !== "A256GCM") {
    throw new Error("Unsupported provider credential format.");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(envelope.iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(envelope.data, "base64url")),
    decipher.final(),
  ]).toString("utf8");
  return JSON.parse(decrypted);
}

export function getCourierWebhookSecret(provider) {
  if (!provider?.encryptedCredentials) return "";
  const credentials = decryptProviderCredentials(provider.encryptedCredentials);
  if (valuePresent(credentials.webhookSecret)) return String(credentials.webhookSecret);
  if (provider.adapterKey === "STEADFAST") return String(credentials.secretKey || "");
  if (provider.adapterKey === "PATHAO") return String(credentials.clientSecret || "");
  return "";
}

const valuePresent = (value) =>
  value !== undefined && value !== null && String(value).trim() !== "";

const enabledValue = (value) => value === true || String(value) === "true";

export function getProviderRuntimeConfiguration(kind, provider) {
  const definition = definitionFor(kind, provider?.adapterKey);
  if (!definition) {
    return {
      integrationAvailable: false,
      credentialsConfigured: false,
      moneyAccountConfigured: Boolean(provider?.moneyAccountId),
      ready: false,
      credentialSource: "MISSING",
      credentials: {},
      config: {},
      error: "No server adapter is registered for this provider.",
    };
  }

  let databaseCredentials = {};
  let credentialError = null;
  if (provider?.encryptedCredentials) {
    try {
      databaseCredentials = decryptProviderCredentials(
        provider.encryptedCredentials,
      );
    } catch {
      credentialError = "Saved credentials cannot be decrypted.";
    }
  }

  const credentials = {};
  for (const field of definition.credentials) {
    if (valuePresent(databaseCredentials[field.key])) {
      credentials[field.key] = databaseCredentials[field.key];
    }
  }

  const storedConfig =
    provider?.nonSecretConfig && typeof provider.nonSecretConfig === "object"
      ? provider.nonSecretConfig
      : {};
  const config = {};
  for (const field of definition.config) {
    config[field.key] = valuePresent(storedConfig[field.key])
      ? storedConfig[field.key]
      : field.defaultValue;
  }
  Object.assign(
    config,
    getProviderEndpointConfiguration(provider?.adapterKey, config),
  );

  const missingCredentialFields = definition.credentials
    .filter((field) => field.required !== false && !valuePresent(credentials[field.key]))
    .map((field) => field.key);
  const missingConfigFields = [
    ...definition.config
    .filter((field) => field.required && !valuePresent(config[field.key]))
    .map((field) => field.key),
    ...(definition.runtimeRequiredConfig || []).filter(
      (fieldKey) => !valuePresent(config[fieldKey]),
    ),
  ];
  const credentialsConfigured =
    missingCredentialFields.length === 0 && missingConfigFields.length === 0;
  const credentialSource = definition.credentials.length
    ? provider?.encryptedCredentials
      ? "DATABASE"
      : "MISSING"
    : "NOT_REQUIRED";
  const moneyAccountRelationLoaded = Boolean(
    provider && Object.prototype.hasOwnProperty.call(provider, "moneyAccount"),
  );
  const moneyAccountConfigured = moneyAccountRelationLoaded
    ? Boolean(provider.moneyAccount?.id && provider.moneyAccount.isActive)
    : Boolean(provider?.moneyAccountId);
  const supportsCod =
    kind === "courier" ? enabledValue(config.supportsCod) : false;
  const moneyAccountRequired =
    definition.accountPolicy === "ALWAYS" ||
    (definition.accountPolicy === "WHEN_COD" && supportsCod);

  return {
    integrationAvailable: definition.integrationAvailable,
    credentialsConfigured,
    moneyAccountConfigured,
    moneyAccountRequired,
    supportsCod,
    ready: Boolean(
      provider?.isActive &&
        definition.integrationAvailable &&
        credentialsConfigured &&
        (!moneyAccountRequired || moneyAccountConfigured),
    ),
    credentialSource,
    hasDatabaseCredentials: Boolean(provider?.encryptedCredentials),
    missingCredentialFields,
    missingConfigFields,
    credentials,
    config,
    error: credentialError,
  };
}

export function getPublicAdapterDefinitions(kind) {
  return Object.entries(DEFINITIONS[kind] || {}).map(([key, definition]) => ({
    key,
    code: definition.code,
    label: definition.label,
    integrationAvailable: definition.integrationAvailable,
    availabilityMessage: definition.availabilityMessage || "",
    accountPolicy: definition.accountPolicy,
    credentialFields: definition.credentials.map(({ key: fieldKey, label, secret }) => ({
      key: fieldKey,
      label,
      secret: secret !== false,
    })),
    configFields: definition.config.map(
      ({ key: fieldKey, label, type, defaultValue, trueLabel, falseLabel, options }) => ({
        key: fieldKey,
        label,
        type: type || "text",
        defaultValue: defaultValue || "",
        trueLabel,
        falseLabel,
        options,
      }),
    ),
  }));
}

export function getProviderAccountType(kind, adapterKey) {
  return definitionFor(kind, adapterKey)?.accountType ||
    (kind === "courier" ? "COURIER" : "PAYMENT_GATEWAY");
}

export function getProviderSeedDefinitions(kind) {
  return Object.entries(DEFINITIONS[kind] || {})
    .filter(([adapterKey]) => !(kind === "courier" && adapterKey === "MANUAL"))
    .map(([adapterKey, definition], index) => ({
      name: definition.label,
      code: definition.code || adapterKey,
      adapterKey,
      sortOrder: index,
      defaultActive: adapterKey === "COD" || adapterKey === "MANUAL",
      defaultConfig: Object.fromEntries(
        definition.config.map((field) => [field.key, field.defaultValue ?? ""]),
      ),
    }));
}

export function prepareProviderCredentialUpdate({
  kind,
  adapterKey,
  previousAdapterKey,
  existingEncryptedCredentials,
  values,
}) {
  const definition = definitionFor(kind, adapterKey);
  if (!definition) throw new Error("Unsupported provider adapter.");
  if (values.clearCredentials === "true") {
    return { encryptedCredentials: null, changed: true };
  }
  const submitted = Object.fromEntries(
    definition.credentials
      .map((field) => [field.key, values[`credential_${field.key}`]])
      .filter(([, value]) => valuePresent(value)),
  );
  if (!Object.keys(submitted).length) {
    if (adapterKey !== previousAdapterKey) {
      return { encryptedCredentials: null, changed: true };
    }
    return {
      encryptedCredentials: existingEncryptedCredentials || null,
      changed: false,
    };
  }
  const existing =
    existingEncryptedCredentials && adapterKey === previousAdapterKey
      ? decryptProviderCredentials(existingEncryptedCredentials)
      : {};
  return {
    encryptedCredentials: encryptProviderCredentials({
      ...existing,
      ...submitted,
    }),
    changed: true,
  };
}

export function extractProviderNonSecretConfig(kind, adapterKey, values) {
  const definition = definitionFor(kind, adapterKey);
  if (!definition) return {};
  return Object.fromEntries(
    definition.config.map((field) => [
      field.key,
      values[`config_${field.key}`] ?? field.defaultValue ?? "",
    ]),
  );
}
