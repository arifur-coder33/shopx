import { PrismaClient } from "@prisma/client";

const globalForPrisma = global;
let prisma;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient();
  }
  prisma = globalForPrisma.prisma;
}
console.log("Database connected:", process.env.DATABASE_URL); // Add this line
export default prisma;


