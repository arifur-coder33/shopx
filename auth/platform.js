import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import {
  authorizePlatformCredentials,
  createIdentityAuthCookies,
  platformJwtCallback,
  platformSessionCallback,
} from "../backend/services/identitySession.server.js";
import { getCurrentStoreContext } from "../backend/services/storeContextService.js";

export const platformAuthConfig = {
  basePath: "/api/platform-auth",
  session: { strategy: "jwt" },
  secret: process.env.PLATFORM_AUTH_SECRET,
  trustHost: true,
  cookies: createIdentityAuthCookies("platform"),
  providers: [
    Credentials({
      id: "platform-credentials",
      name: "Platform Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if ((await getCurrentStoreContext()).type !== "PLATFORM") return null;
        return authorizePlatformCredentials(credentials);
      },
    }),
  ],
  callbacks: {
    jwt: platformJwtCallback,
    session: platformSessionCallback,
  },
};

export const {
  auth: platformAuth,
  signIn: platformSignIn,
  signOut: platformSignOut,
  handlers: platformHandlers,
} = NextAuth(platformAuthConfig);
