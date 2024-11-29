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
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {},
      authorize: async (credentials) => {
        if (!credentials || !credentials.email || !credentials.password) {
          return null;
        }
        let user = null;
        user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        console.log("User found:", user); // Logs user to verify it's fetched correctly

        if (!user) {
          // throw new Error("Incorrect email.");
          return null;
        }

        const isMatch = await bcrypt.compare(
          credentials.password,
          user.password
        );
        console.log("Password match:", isMatch);

        if (!isMatch) {
          // throw new Error("Incorrect password.");
          return null;
        }

        return user;
      },
    }),
  ],

  session: {
    strategy: "jwt",
  },
  // Define the trusted URLs for local development and production
  // This tells NextAuth.js to trust the localhost during local dev.
  trustHost: true, // Important for trusting localhost in dev mode
  secret: process.env.AUTH_SECRET,
  pages: "/login",
});
