import { getCurrentStoreContext } from "./storeContextService.js";
import {
  authenticatePlatformMember,
  authenticateStoreMember,
} from "./identityAuthentication.server.js";

const cookieOptions = Object.freeze({
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  secure: process.env.NODE_ENV === "production",
});

export function createIdentityAuthCookies(namespace) {
  const safeNamespace = String(namespace || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");
  if (!safeNamespace) throw new Error("Identity cookie namespace is required.");

  const securePrefix = process.env.NODE_ENV === "production" ? "__Secure-" : "";
  const hostPrefix = process.env.NODE_ENV === "production" ? "__Host-" : "";

  return {
    sessionToken: {
      name: `${securePrefix}authjs.${safeNamespace}.session-token`,
      options: { ...cookieOptions },
    },
    callbackUrl: {
      name: `${securePrefix}authjs.${safeNamespace}.callback-url`,
      options: { ...cookieOptions },
    },
    csrfToken: {
      name: `${hostPrefix}authjs.${safeNamespace}.csrf-token`,
      options: { ...cookieOptions },
    },
  };
}

export async function authorizePlatformCredentials(
  credentials,
  database,
) {
  const result = await authenticatePlatformMember(
    {
      email: credentials?.email,
      password: credentials?.password,
    },
    database,
  );
  return result.success ? result.identity : null;
}

export async function authorizeStoreCredentials(
  credentials,
  {
    database,
    resolveTrustedStoreContext = getCurrentStoreContext,
  } = {},
) {
  const context = await resolveTrustedStoreContext();
  if (context?.type !== "STORE" || !context.store?.id) return null;

  const result = await authenticateStoreMember(
    {
      trustedStoreId: context.store.id,
      email: credentials?.email,
      password: credentials?.password,
    },
    database,
  );
  return result.success ? result.identity : null;
}

export async function platformJwtCallback({ token, user }) {
  if (!user) return token;
  return {
    ...token,
    identityType: "PLATFORM_MEMBER",
    platformMemberId: user.id,
    roleId: user.roleId,
    role: user.role,
    tokenVersion: user.tokenVersion,
  };
}

export async function platformSessionCallback({ session, token }) {
  if (token.identityType !== "PLATFORM_MEMBER") return session;
  return {
    ...session,
    user: {
      id: token.platformMemberId,
      identityType: token.identityType,
      platformMemberId: token.platformMemberId,
      roleId: token.roleId,
      role: token.role,
    },
  };
}

export async function storeJwtCallback({ token, user }) {
  if (!user) return token;
  return {
    ...token,
    identityType: "STORE_MEMBER",
    storeMemberId: user.id,
    storeId: user.storeId,
    roleId: user.roleId,
    role: user.role,
    tokenVersion: user.tokenVersion,
  };
}

export async function storeSessionCallback({ session, token }) {
  if (token.identityType !== "STORE_MEMBER") return session;
  return {
    ...session,
    user: {
      id: token.storeMemberId,
      identityType: token.identityType,
      storeMemberId: token.storeMemberId,
      storeId: token.storeId,
      roleId: token.roleId,
      role: token.role,
    },
  };
}
