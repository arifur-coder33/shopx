import { PrismaClient } from "@prisma/client";

const globalForPrisma = global; // Workaround for Next.js to keep the Prisma instance across hot reloads
let prisma;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  const hasCurrentSchema =
    globalForPrisma.prisma?.paymentGateway &&
    globalForPrisma.prisma?.courierProvider &&
    globalForPrisma.prisma?.accountingPeriod;

  if (!hasCurrentSchema) {
    globalForPrisma.prisma?.$disconnect().catch(() => {});
    globalForPrisma.prisma = new PrismaClient();
  }
  prisma = globalForPrisma.prisma;
}

export default prisma;
