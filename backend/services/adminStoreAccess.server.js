import { auth } from "@/auth";
import { storeAuth } from "@/auth/store";
import { hasStorePermission, requireStorePermission } from "./identityAuthorization.server.js";
import { createIdentityAuthCookies } from "./identitySession.server.js";
import { hasUIPermission } from "@/lib/hasUIPermission.js.js";
import { headers } from "next/headers";

export async function hasStoreMemberCookie() {
  const name = createIdentityAuthCookies("store").sessionToken.name;
  const header = (await headers()).get("cookie") || "";
  return header.split(";").some((part) => part.trim().startsWith(`${name}=`));
}

// A present StoreMember credential always takes precedence; an invalid or
// unauthorized StoreMember must never inherit an unrelated legacy User role.
export async function getAdminAccess(resource, action, legacyResource = resource) {
  if (await hasStoreMemberCookie()) {
    const session = await storeAuth();
    if (!session?.user) return { allowed: false, identity: "STORE_MEMBER" };
    return {
      allowed: await hasStorePermission(resource, action, { getSession: async () => session }),
      identity: "STORE_MEMBER",
    };
  }
  const session = await auth();
  return {
    allowed: hasUIPermission(session?.user?.permissions, legacyResource, action.toLowerCase()),
    identity: "LEGACY_USER",
  };
}

export async function requireAdminStoreEntry() {
  if (await hasStoreMemberCookie()) {
    const session = await storeAuth();
    await requireStorePermission("STORE", "VIEW", { getSession: async () => session });
    return "STORE_MEMBER";
  }
  return "LEGACY_USER";
}
