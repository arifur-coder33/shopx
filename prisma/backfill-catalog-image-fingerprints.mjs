import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { createImageFingerprint } from "../backend/utils/imageFingerprint.mjs";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

async function main() {
  const media = await prisma.media.findMany({
    where: {
      imageDifferenceHash: null,
      OR: [
        { productsAsThumbnail: { some: {} } },
        { productGallery: { some: {} } },
        { ProductVariationThumbnail: { some: {} } },
      ],
    },
    select: { id: true, url: true, host: true },
  });
  let updated = 0;
  let skipped = 0;
  for (const item of media) {
    try {
      const url = new URL(item.url);
      if (
        url.protocol !== "https:" ||
        url.hostname !== "res.cloudinary.com" ||
        item.host !== "cloudinary"
      ) {
        skipped += 1;
        continue;
      }
      const response = await fetch(url, {
        redirect: "error",
        signal: AbortSignal.timeout(20000),
      });
      const mimeType = response.headers.get("content-type") || "";
      const contentLength = Number(response.headers.get("content-length") || 0);
      if (!response.ok || !mimeType.startsWith("image/") || contentLength > 12 * 1024 * 1024) {
        skipped += 1;
        continue;
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!bytes.length || bytes.length > 12 * 1024 * 1024) {
        skipped += 1;
        continue;
      }
      const fingerprint = await createImageFingerprint(bytes);
      if (!fingerprint) {
        skipped += 1;
        continue;
      }
      if (apply) {
        await prisma.media.update({ where: { id: item.id }, data: fingerprint });
      }
      updated += 1;
    } catch (error) {
      skipped += 1;
      console.warn(`Skipped media ${item.id}:`, error?.message || error);
    }
  }
  console.log(
    JSON.stringify({ mode: apply ? "APPLY" : "DRY_RUN", examined: media.length, fingerprinted: updated, skipped }, null, 2),
  );
}

main()
  .catch((error) => {
    console.error("Catalog image fingerprint backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
