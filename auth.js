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
       
          if (user) {
        
            const isMatch =await bcrypt.compare(credentials.password,user.password)
            if (isMatch) {
              return user;
            } else {
              throw new Error("আপনার ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।");
            }
          } else {
            throw new Error("আপনি এখনো নিবন্ধন করেননি।");
          }
        } catch (error) {
          throw error;
     
        }
      },
    }),
  ],
});
