"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { platformSignIn, platformSignOut } from "@/auth/platform";
import { provisionStore } from "../services/storeProvisioning.server";
import { updateStore } from "../services/storeManagement.server";
import { createPlatformMember, updatePlatformMemberStatus } from "../services/platformMemberManagement.server";
import { requirePlatformConsole, requirePlatformHost } from "../services/platformConsole.server";

const objectId = (value) => /^[0-9a-f]{24}$/i.test(String(value || ""));
const field = (form, key) => String(form.get(key) || "").trim();
const destination = (path, message, kind = "notice") => `${path}?${kind}=${encodeURIComponent(message)}`;
const visibleErrors = new Set([
  "Store name must be between 2 and 120 characters.", "Store slug is invalid.", "Store status is invalid.",
  "Owner name must be between 2 and 120 characters.", "Owner email is invalid.",
  "The Store slug or Store-scoped owner email already exists.", "Password must be between 8 and 1024 characters.",
  "Plan name or slug is invalid.", "Price must be a non-negative whole number in minor currency units.",
  "Features configuration is too large.", "Limits configuration is too large.",
  "Features must be a JSON object.", "Limits must be a JSON object.",
  "Feature values must be true or false.", "Limits must be non-negative whole numbers.",
  "The FREE plan must stay active.", "The FREE plan slug cannot change.", "Plan was not found.",
  "Member name must be between 2 and 120 characters.", "Member email is required.",
  "A Platform member with this email already exists.", "The selected Platform role is unavailable.",
  "The platform must retain an active SUPER_ADMIN.", "Platform member was not found.", "Member status is invalid.",
]);
const safeError = (error, fallback) => error?.code === "P2002" ? "A record with this identifier already exists." : visibleErrors.has(error?.message) ? error.message : fallback;

export async function platformLoginAction(_previous, form) {
  try {
    await requirePlatformHost();
    await platformSignIn("platform-credentials", {
      email: field(form, "email"), password: String(form.get("password") || ""), redirectTo: "/platform",
    });
  } catch (error) {
    if (error instanceof AuthError) return { error: "Invalid email or password." };
    throw error;
  }
}

export async function platformLogoutAction() {
  await platformSignOut({ redirectTo: "/platform/login" });
}

export async function createPlatformStoreAction(form) {
  await requirePlatformConsole("STORES", "MANAGE");
  let path;
  try {
    const result = await provisionStore({
      store: { name: field(form, "name"), slug: field(form, "slug") },
      owner: { name: field(form, "ownerName"), email: field(form, "ownerEmail"), password: String(form.get("ownerPassword") || "") },
    });
    path = destination(`/platform/stores/${result.store.id}`, "Store and owner created. Add a verified domain before Store login.");
  } catch (error) {
    path = destination("/platform/stores", safeError(error, "Unable to create Store."), "error");
  }
  redirect(path);
}

export async function updatePlatformStoreAction(form) {
  await requirePlatformConsole("STORES", "MANAGE");
  const id = field(form, "storeId");
  if (!objectId(id)) throw new Error("Invalid Store ID.");
  let path;
  try {
    await updateStore(id, { name: field(form, "name"), slug: field(form, "slug") });
    path = destination(`/platform/stores/${id}`, "Store updated.");
  } catch (error) {
    path = destination(`/platform/stores/${id}`, safeError(error, "Unable to update Store."), "error");
  }
  redirect(path);
}

export async function setPlatformStoreStatusAction(form) {
  await requirePlatformConsole("STORES", "MANAGE");
  const id = field(form, "storeId");
  if (!objectId(id)) throw new Error("Invalid Store ID.");
  const status = field(form, "status");
  let path;
  try {
    await updateStore(id, { status });
    path = destination(`/platform/stores/${id}`, status === "ACTIVE" ? "Store activated." : "Store suspended.");
  } catch (error) {
    path = destination(`/platform/stores/${id}`, safeError(error, "Unable to change Store status."), "error");
  }
  redirect(path);
}

function parsePlanConfig(raw, kind) {
  const text = String(raw || "{}");
  if (text.length > 5000) throw new Error(`${kind} configuration is too large.`);
  const value = JSON.parse(text);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${kind} must be a JSON object.`);
  if (kind === "Features" && Object.values(value).some((item) => typeof item !== "boolean")) throw new Error("Feature values must be true or false.");
  if (kind === "Limits" && Object.values(value).some((item) => !Number.isSafeInteger(item) || item < 0)) throw new Error("Limits must be non-negative whole numbers.");
  return value;
}

function planInput(form) {
  const name = field(form, "name");
  const slug = field(form, "slug").toUpperCase();
  if (name.length < 2 || name.length > 100 || !/^[A-Z0-9]+(?:_[A-Z0-9]+)*$/.test(slug) || slug.length > 50) throw new Error("Plan name or slug is invalid.");
  const price = (key) => {
    const raw = field(form, key);
    if (!raw) return null;
    const value = Number(raw);
    if (!Number.isSafeInteger(value) || value < 0) throw new Error("Price must be a non-negative whole number in minor currency units.");
    return value;
  };
  const isActive = form.get("isActive") === "on";
  if (slug === "FREE" && !isActive) throw new Error("The FREE plan must stay active.");
  return { name, slug, description: field(form, "description") || null, isActive,
    monthlyPriceMinor: price("monthlyPriceMinor"), yearlyPriceMinor: price("yearlyPriceMinor"),
    features: parsePlanConfig(form.get("features"), "Features"), limits: parsePlanConfig(form.get("limits"), "Limits") };
}

export async function savePlatformPlanAction(form) {
  await requirePlatformConsole("BILLING", "MANAGE");
  let path;
  try {
    const id = field(form, "planId");
    const data = planInput(form);
    if (id) {
      if (!objectId(id)) throw new Error("Invalid Plan ID.");
      const original = await prisma.plan.findUnique({ where: { id }, select: { slug: true } });
      if (!original) throw new Error("Plan was not found.");
      if (original.slug === "FREE" && data.slug !== "FREE") throw new Error("The FREE plan slug cannot change.");
      await prisma.plan.update({ where: { id }, data });
    } else {
      await prisma.plan.create({ data });
    }
    path = destination("/platform/plans", "Plan saved.");
  } catch (error) {
    path = destination("/platform/plans", safeError(error, "Unable to save Plan."), "error");
  }
  redirect(path);
}

export async function createPlatformMemberAction(form) {
  await requirePlatformConsole("PLATFORM", "MANAGE");
  let path;
  try {
    await createPlatformMember({ name: field(form, "name"), email: field(form, "email"), password: String(form.get("password") || ""), roleId: field(form, "roleId") });
    path = destination("/platform/members", "Platform member created.");
  } catch (error) {
    path = destination("/platform/members", safeError(error, "Unable to create member."), "error");
  }
  redirect(path);
}

export async function setPlatformMemberStatusAction(form) {
  await requirePlatformConsole("PLATFORM", "MANAGE");
  const id = field(form, "memberId");
  if (!objectId(id)) throw new Error("Invalid member ID.");
  let path;
  try {
    await updatePlatformMemberStatus(id, field(form, "status"));
    path = destination("/platform/members", "Member status updated.");
  } catch (error) {
    path = destination("/platform/members", safeError(error, "Unable to update member."), "error");
  }
  redirect(path);
}
