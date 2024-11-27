import NextAuth from "next-auth"
import Github from "next-auth/providers/github"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"

// import { saltAndHashPassword } from "./utils/helper"
import prisma from "./lib/prisma"

export const {
  handlers: { GET, POST },
  signIn,
  signOut,
  auth
} = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    // Github({
    //   clientId: process.env.AUTH_GITHUB_ID,
    //   clientSecret: process.env.AUTH_GITHUB_SECRET
    // }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "email@example.com"
        },
        password: { label: "Password", type: "password" }
      },
      authorize: async credentials => {
        if (!credentials || !credentials.email || !credentials.password) {
          return null
        }

        const email = credentials.email
       

        let user = await prisma.user.findUnique({
          where: {
            email
          }
        })

        if (!user) {
            throw new Error("Incorrect email.")
        } else {
          const isMatch = await bcrypt.compare(
            credentials.password,
            user.password
          )
          console.log(`check password: ${isMatch}`)
          if (!isMatch) {
            throw new Error("Incorrect password.")
          }
        }

        return user
      }
    })
  ]
})
