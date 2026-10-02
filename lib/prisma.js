import { PrismaClient } from "@prisma/client";

const globalForPrisma = global; // Workaround for Next.js to keep the Prisma instance across hot reloads
const prismaOptions = {
  // Prisma Postgres adds network round-trips to interactive writes. Give
  // product edits and other multi-step transactions enough room to complete.
  transactionOptions: { maxWait: 10000, timeout: 30000 },
};
let prisma;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient(prismaOptions);
} else {
  const hasCurrentSchema =
    globalForPrisma.prisma?.paymentGateway &&
    globalForPrisma.prisma?.courierProvider &&
    globalForPrisma.prisma?.accountingPeriod &&
    globalForPrisma.prisma?.socialTrackingSetting &&
    globalForPrisma.prisma?.contentPage &&
    globalForPrisma.prisma?.productVideo &&
    globalForPrisma.prisma?.specification;

  if (!hasCurrentSchema) {
    globalForPrisma.prisma?.$disconnect().catch(() => {});
    globalForPrisma.prisma = new PrismaClient(prismaOptions);
  }
  prisma = globalForPrisma.prisma;
}

export default prisma;
