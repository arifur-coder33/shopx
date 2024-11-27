import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import prisma from "./lib/prisma";

export const {
  handlers: { GET, POST },
  signIn,
  signOut,
  auth,
} = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "email@example.com",
        },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials || !credentials.email || !credentials.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        console.log("User found:", user); // Logs user to verify it's fetched correctly

        if (!user) {
          throw new Error("Incorrect email.");
        }

        const isMatch = await bcrypt.compare(
          credentials.password,
          user.password
        );
        console.log("Password match:", isMatch);

        if (!isMatch) {
          throw new Error("Incorrect password.");
        }

        return user;
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      if (user) {
        return true; // Allow login if user is found
      } else {
        // Log error in production for better debugging
        console.error("SignIn Error: Incorrect credentials");
        return false; // Deny login if no user is found
      }
    },
    async redirect({ url, baseUrl }) {
      return baseUrl;
    },
  },

  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
  },
  // Define the trusted URLs for local development and production
  // This tells NextAuth.js to trust the localhost during local dev.
  trustHost: true, // Important for trusting localhost in dev mode
  secret: process.env.NEXTAUTH_SECRET,
});
