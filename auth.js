import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Facebook from "next-auth/providers/facebook";
import Google from "next-auth/providers/google";
import { authConfig } from "./auth.config";
import { getEnabledSocialAuthProviders } from "./backend/services/socialAuthService";
import prisma from "./lib/prisma";
const permissionCache = new Map();
export function invalidateRolePermissionCache(roleId) {
  if (roleId) permissionCache.delete(roleId);
}
const baseAdapter = PrismaAdapter(prisma);
async function getSocialProviders() {
  const configured = await getEnabledSocialAuthProviders();
  return [
    ...(configured.google ? [Google({ ...configured.google, allowDangerousEmailAccountLinking: true })] : []),
    ...(configured.facebook ? [Facebook({ ...configured.facebook, allowDangerousEmailAccountLinking: true })] : []),
  ];
}
const authAdapter = {
  ...baseAdapter,
  async createUser(profile) {
    const email = String(profile.email || "").trim().toLowerCase();
    if (!email) throw new Error("Google did not return an email address");

    const defaultRole = await prisma.role.upsert({
      where: { name: "USER" },
      update: {},
      create: { name: "USER" },
    });
    const password = await bcrypt.hash(randomBytes(32).toString("hex"), 10);

    return prisma.user.create({
      data: {
        email,
        name: profile.name || null,
        image: profile.image || null,
        emailVerifiedAt: profile.email_verified === true ? new Date() : null,
        password,
        roleId: defaultRole.id,
      },
    });
  },
  async getUserByEmail(email) {
    return prisma.user.findUnique({
      where: { email: String(email || "").trim().toLowerCase() },
    });
  },
  async updateUser({ id, email, name }) {
    const data = {};
    if (email !== undefined) {
      const normalizedEmail = String(email).trim().toLowerCase();
      const existing = await prisma.user.findUnique({ where: { id }, select: { email: true } });
      data.email = normalizedEmail;
      if (existing?.email !== normalizedEmail) {
        data.emailVerifiedAt = null;
        data.emailVerificationOtpHash = null;
        data.emailVerificationOtpExpiresAt = null;
        data.emailVerificationOtpSentAt = null;
        data.emailVerificationOtpAttempts = 0;
      }
    }
    if (name !== undefined) data.name = name;
    return prisma.user.update({ where: { id }, data });
  },
};

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth(async () => ({
  adapter: authAdapter,

  ...authConfig,

  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
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
          name: user.name,
          role: user.role?.name ?? null,
          roleId: user.roleId ?? null,
          tokenVersion: user.tokenVersion,
        };
      },
    }),
    ...(await getSocialProviders()),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        if (profile?.email_verified !== true) return false;
        if (user?.id) {
          await prisma.user.updateMany({
            where: { id: user.id, emailVerifiedAt: null },
            data: { emailVerifiedAt: new Date() },
          });
        }
        return true;
      }
      if (account?.provider === "facebook") return typeof profile?.email === "string" && profile.email.length > 0;
      return true;
    },

    async jwt({ token, user, account, profile }) {
      if (user?.id) {
        if (["facebook", "google"].includes(account?.provider)) {
          const name = typeof profile?.name === "string" ? profile.name.trim() : "";
          const image = account.provider === "google"
            ? profile?.picture || user.image
            : profile?.picture?.data?.url || user.image;
          if (name) await prisma.user.updateMany({
            where: { id: user.id, OR: [{ name: null }, { name: "" }] },
            data: { name },
          });
          if (typeof image === "string" && image.startsWith("https://")) {
            await prisma.user.updateMany({
              where: { id: user.id, OR: [{ image: null }, { image: "" }] },
              data: { image },
            });
          }
        }
        const authUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            id: true,
            name: true,
            image: true,
            email: true,
            roleId: true,
            tokenVersion: true,
            role: { select: { name: true } },
          },
        });
        if (!authUser) return {};

        token.id = authUser.id;
        token.name = authUser.name;
        token.picture = authUser.image;
        token.email = authUser.email;
        token.role = authUser.role?.name ?? null;
        token.roleId = authUser.roleId;
        token.tokenVersion = authUser.tokenVersion;

        // Fetch permissions, use cache if available
        if (token.role === "SUPER_ADMIN") {
          token.permissions = ["*"];
        } else if (authUser.roleId) {
          let permissions = permissionCache.get(authUser.roleId);
          if (!permissions) {
            const perms = await prisma.rolePermission.findMany({
              where: { roleId: authUser.roleId, allowed: true },
              include: { resource: true, action: true },
            });
            permissions = perms.map((p) => `${p.resource.key}:${p.action.key}`);
            permissionCache.set(authUser.roleId, permissions);
          }
          token.permissions = permissions;
        } else {
          token.permissions = [];
        }
      }

      // 🔹 Every request: check tokenVersion
      if (token?.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { tokenVersion: true, roleId: true },
        });

        if (!dbUser) return {}; // user deleted → force logout

        if (dbUser.tokenVersion !== token.tokenVersion) {
          // 🔥 Fetch full fresh user
          const freshUser = await prisma.user.findUnique({
            where: { id: token.id },
            select: {
              name: true,
              email: true,
              tokenVersion: true,
              roleId: true,
              role: { select: { name: true } },
            },
          });

          if (!freshUser) return {};

          token.tokenVersion = freshUser.tokenVersion;
          token.name = freshUser.name;
          token.email = freshUser.email;
          token.role = freshUser.role?.name ?? null;
          token.roleId = freshUser.roleId;

          if (freshUser.role?.name === "SUPER_ADMIN") {
            token.permissions = ["*"];
          } else if (freshUser.roleId) {
            const perms = await prisma.rolePermission.findMany({
              where: { roleId: freshUser.roleId, allowed: true },
              include: { resource: true, action: true },
            });

            token.permissions = perms.map(
              (p) => `${p.resource.key}:${p.action.key}`,
            );
          } else {
            token.permissions = [];
          }
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token?.id) {
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.image = token.picture ?? null;
        session.user.email = token.email;
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
}));
