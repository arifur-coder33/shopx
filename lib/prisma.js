import { PrismaClient } from "@prisma/client";

const globalForPrisma = global; // Workaround for Next.js to keep the Prisma instance across hot reloads
let prisma;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient();
  }
  prisma = globalForPrisma.prisma;
}

console.log("Database connected:", process.env.DATABASE_URL); // For debugging purposes
export default prisma;
