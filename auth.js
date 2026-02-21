import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import prisma from "./lib/prisma";

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  adapter: PrismaAdapter(prisma),

  ...authConfig,

  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        console.log("Attempting login with credentials:", credentials);
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // 🔐 Authentication (Doc: Verify identity)
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            role: true,
          },
        });
        console.log("User found for authentication:", user);

        if (!user || !user.password) return null;

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password,
        );

        if (!isValid) return null;

        // ✅ Return MINIMUM safe user data (Doc recommendation)
        return {
          id: user.id,
          email: user.email,
          role: user.role?.name ?? null,
          roleId: user.roleId ?? null,
          tokenVersion: user.tokenVersion,
        };
      },
    }),
  ],

  callbacks: {
    /**
     * 🔑 JWT Callback
     */
    async jwt({ token, user }) {
      /**
       * 1️⃣ Login time
       */
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.roleId = user.roleId;
        token.tokenVersion = user.tokenVersion;

        // 🔐 Attach permissions ONLY at login
        if (user.role === "SUPER_ADMIN") {
          token.permissions = ["*"];
        } else if (user.roleId) {
          const permissions = await prisma.rolePermission.findMany({
            where: { roleId: user.roleId, allowed: true },
            include: {
              resource: true,
              action: true,
            },
          });

          token.permissions = permissions.map(
            (p) => `${p.resource.key}:${p.action.key}`,
          );
        } else {
          token.permissions = [];
        }
      }

      /**
       * 2️⃣ Every request → Security validation only
       */
      if (token?.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: {
            tokenVersion: true,
            roleId: true,
          },
        });

        if (!dbUser) return {};

        // 🔥 Security change detected
        if (dbUser.tokenVersion !== token.tokenVersion) {
          token.tokenVersion = dbUser.tokenVersion;
          const permissions = await prisma.rolePermission.findMany({
            where: { roleId: dbUser.roleId, allowed: true },
            include: { resource: true, action: true },
          });
          token.permissions = permissions.map(
            (p) => `${p.resource.key}:${p.action.key}`,
          );
        }
      }

      return token;
    },

    /**
     * 📦 Session Callback (Client-safe data)
     */
    async session({ session, token }) {
      if (session.user && token?.id) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.roleId = token.roleId;
        session.user.permissions = token.permissions ?? [];
      }

      return session;
    },
  },

  secret: process.env.AUTH_SECRET,
  trustHost: true,

  pages: {
    signIn: "/login",
  },
});
