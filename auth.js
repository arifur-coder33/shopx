import prisma from "@/lib/prisma";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import NextAuth from "next-auth";
import { authConfig } from "./app/auth.config";
import bcrypt from "bcryptjs";
import CredentialsProvider from "next-auth/providers/credentials";
export const { handlers, auth, signIn, signOut } = NextAuth({
  debug: true,
  // adapter: MongoDBAdapter(mongoClientPromise, {
  //   databaseName: process.env.ENVIRONMENT,
  // }),
  // ...authConfig,
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        if (credentials == null) return null;

        try {
          // await dbConnect();
          const user =  await prisma.user.findUnique({
            where: {
              email: credentials?.email,
            },
          })
        
          // const user = await userModel.findOne({
          //   email: credentials?.email,
          // });

          if (user) {
            const isMatch =await bcrypt.compare( credentials.password, user.password)

            if (isMatch) {
              const {name,email,role}=user
              console.log({name,email,role})
              return {name,email,role};
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
            throw new Error("আপনার ইমেইল অথবা পাসওয়ার্ড চেক করুন।");
          } else {
            throw new Error("Something Went Wrong");
          }
        }
      },
    }),
  ],
});;
