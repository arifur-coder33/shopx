import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import prisma from "./lib/prisma";
export const {
  handlers: { GET, POST },
  signIn,
  signOut,
  auth,
} = NextAuth({
  ...authConfig,

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

        if (!user) {
          // throw new Error("Incorrect email.");
          return null;
        }

        const isMatch = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isMatch) {
          // throw new Error("Incorrect password.");
          return null;
        }
        console.log(
          "-----+++++++++++++++++++++++++++++++++++++++-----------------------------"
        );
        console.log(`user after login: ${JSON.stringify(user)}`);
        console.log("---++++++++++++++++++++++-------------------------------");
        return user;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      if (trigger === "update" && session) {
        token = { ...token, ...session };
      }
      console.log("----------------------------------");
      console.log(`callback jwt  user :${JSON.stringify(user)}`);
      console.log("----------------------------------");
      console.log(`callback jwt  token :${JSON.stringify(token)}`);

      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      console.log("----------------------------------");
      console.log(`callback session  session :${JSON.stringify(session)}`);
      console.log("----------------------------------");
      console.log(`callback session  token :${JSON.stringify(token)}`);
      return session;
    },
    // async redirect({ url, baseUrl }) {
    //   // If a callbackUrl exists and is relative, use it
    //   console.log(url);
    //   if (url.startsWith(baseUrl)) {
    //     return url;
    //   }
    //   if (url.startsWith("/")) {
    //     return `${baseUrl}${url}`;
    //   }
    //   // Default redirect to the base URL
    //   return baseUrl;
    // },
  },

  // Define the trusted URLs for local development and production
  // This tells NextAuth.js to trust the localhost during local dev.
  trustHost: true, // Important for trusting localhost in dev mode
  secret: process.env.AUTH_SECRET,
  pages: "/login",
});
