import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import {
  authorizeStoreCredentials,
  createIdentityAuthCookies,
  storeJwtCallback,
  storeSessionCallback,
} from "../backend/services/identitySession.server.js";

export const storeAuthConfig = {
  basePath: "/api/store-auth",
  session: { strategy: "jwt" },
  secret: process.env.STORE_AUTH_SECRET,
  trustHost: true,
  cookies: createIdentityAuthCookies("store"),
  providers: [
    Credentials({
      id: "store-credentials",
      name: "Store Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize(credentials) {
        return authorizeStoreCredentials(credentials);
      },
    }),
  ],
  callbacks: {
    jwt: storeJwtCallback,
    session: storeSessionCallback,
  },
};

export const {
  auth: storeAuth,
  signIn: storeSignIn,
  signOut: storeSignOut,
  handlers: storeHandlers,
} = NextAuth(storeAuthConfig);
