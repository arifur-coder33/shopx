import { getCurrentStoreContext } from "./storeContextService.js";
import { hasPlatformPermission, requirePlatformPermission } from "./identityAuthorization.server.js";
import { notFound } from "next/navigation";

export async function requirePlatformHost() {
  const context = await getCurrentStoreContext();
  if (context.type !== "PLATFORM") throw new Error("Platform access requires the configured Platform hostname.");
}

export async function requirePlatformConsole(resource = "PLATFORM", action = "VIEW") {
  await requirePlatformHost();
  await requirePlatformPermission(resource, action);
}

export async function requirePlatformPage(resource = "PLATFORM", action = "VIEW") {
  await requirePlatformHost();
  if (!await hasPlatformPermission(resource, action)) notFound();
}
