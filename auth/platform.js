import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import {
  authorizePlatformCredentials,
  createIdentityAuthCookies,
  platformJwtCallback,
  platformSessionCallback,
} from "../backend/services/identitySession.server.js";

export const platformAuthConfig = {
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
      authorize(credentials) {
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
