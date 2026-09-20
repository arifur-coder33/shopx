import prisma from "../../lib/prisma.js";
import { normalizeHostname } from "../utils/hostname.js";
import { requirePlatformPermission } from "./identityAuthorization.server.js";

const STORE_SELECT = {
  id: true,
  name: true,
  slug: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

const cleanName = (value) => {
  const name = String(value || "").trim();
  if (name.length < 2 || name.length > 120) {
    throw new Error("Store name must be between 2 and 120 characters.");
  }
  return name;
};

const cleanSlug = (value) => {
  const slug = String(value || "").trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) {
    throw new Error("Store slug is invalid.");
  }
  return slug;
};

const cleanStatus = (value) => {
  if (!['ACTIVE', 'INACTIVE'].includes(value)) {
    throw new Error("Store status is invalid.");
  }
  return value;
};

const dependencies = (options = {}) => ({
  database: options.database || prisma,
  authorize: options.requirePermission || requirePlatformPermission,
  authorizationOptions: options.authorizationOptions,
});

export function normalizeStoreCreateInput(input) {
  return {
    name: cleanName(input?.name),
    slug: cleanSlug(input?.slug),
    status: input?.status ? cleanStatus(input.status) : "ACTIVE",
  };
}

export async function getStoreById(id, options) {
  const dependency = dependencies(options);
  await dependency.authorize(
    "STORES",
    "VIEW",
    dependency.authorizationOptions,
  );
  if (typeof id !== "string" || !id.trim()) return null;
  return dependency.database.store.findUnique({
    where: { id },
    select: STORE_SELECT,
  });
}

export async function getStoreByDomain(domain, options) {
  const dependency = dependencies(options);
  await dependency.authorize(
    "STORES",
    "VIEW",
    dependency.authorizationOptions,
  );
  const normalizedDomain = normalizeHostname(domain);
  if (!normalizedDomain) return null;
  const record = await dependency.database.storeDomain.findUnique({
    where: { domain: normalizedDomain },
    select: { store: { select: STORE_SELECT } },
  });
  return record?.store || null;
}

export async function createStore(input, options) {
  const dependency = dependencies(options);
  await dependency.authorize(
    "STORES",
    "MANAGE",
    dependency.authorizationOptions,
  );
  return dependency.database.store.create({
    data: normalizeStoreCreateInput(input),
    select: STORE_SELECT,
  });
}

export async function updateStore(id, input, options) {
  const dependency = dependencies(options);
  await dependency.authorize(
    "STORES",
    "MANAGE",
    dependency.authorizationOptions,
  );
  if (typeof id !== "string" || !id.trim()) {
    throw new Error("Store ID is required.");
  }
  const data = {};
  if (input?.name !== undefined) data.name = cleanName(input.name);
  if (input?.slug !== undefined) data.slug = cleanSlug(input.slug);
  if (input?.status !== undefined) data.status = cleanStatus(input.status);
  if (!Object.keys(data).length) throw new Error("No Store changes provided.");

  return dependency.database.store.update({
    where: { id },
    data,
    select: STORE_SELECT,
  });
}
