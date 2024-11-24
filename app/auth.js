import prisma from "@/lib/prisma";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
export const { handlers, auth, signIn, signOut } = NextAuth({
  debug: true,
  adapter: MongoDBAdapter(mongoClientPromise, {
    databaseName: process.env.ENVIRONMENT,
  }),
  ...authConfig,
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        if (credentials == null) return null;

        try {
          const user = await prisma.user.findUnique({
            where: {
              email: credentials?.email,
            },
          });
          console.log(user);

          if (user) {
            const isMatch = credentials.password == user.password;

            if (isMatch) {
              return user;
            } else {
              throw new Error("CHECK_YOUR_PASSWORD");
            }
          } else {
            throw new Error("USER_NOT_FOUND");
          }
        } catch (error) {
          if (
            error.message == "CHECK_YOUR_PASSWORD" ||
            error.message == "USER_NOT_FOUND"
          ) {
            throw error;
          } else {
            throw new Error("Something Went Wrong");
          }
        }
      },
    }),
  ],
});
