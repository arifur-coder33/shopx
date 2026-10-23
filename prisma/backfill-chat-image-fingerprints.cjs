require("dotenv/config");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

async function main() {
  const products = await prisma.product.findMany({
    where: { isActive: true, status: "ACTIVE" },
    select: {
      thumbnail: { select: { id: true, url: true, imageDifferenceHash: true } },
      gallery: {
        select: {
          media: { select: { id: true, url: true, imageDifferenceHash: true } },
        },
      },
      variations: {
        select: {
          thumbnail: {
            select: { id: true, url: true, imageDifferenceHash: true },
          },
        },
      },
    },
  });
  const media = new Map();
  for (const product of products) {
    for (const item of [
      product.thumbnail,
      ...product.gallery.map((entry) => entry.media),
      ...product.variations.map((variation) => variation.thumbnail),
    ]) {
      if (item?.id && !item.imageDifferenceHash) media.set(item.id, item);
    }
  }
  console.log(`${media.size} active product image(s) need fingerprints.`);
  if (!apply) {
    console.log("Dry run only. Add --apply to download, fingerprint, and save them.");
    return;
  }

  const { createCatalogImageFingerprint } = await import(
    "../backend/services/imageFingerprint.js"
  );
  const pending = [...media.values()];
  let cursor = 0;
  let updated = 0;
  let skipped = 0;
  await Promise.all(
    Array.from({ length: Math.min(8, pending.length) }, async () => {
      while (cursor < pending.length) {
        const item = pending[cursor++];
        try {
          const url = new URL(item.url);
          if (
            url.protocol !== "https:" ||
            !/(^|\.)cloudinary\.com$/iu.test(url.hostname)
          ) {
            skipped += 1;
            continue;
          }
          const response = await fetch(url, {
            redirect: "error",
            signal: AbortSignal.timeout(12000),
          });
          const contentLength = Number(response.headers.get("content-length") || 0);
          if (
            !response.ok ||
            !String(response.headers.get("content-type") || "").startsWith("image/") ||
            contentLength > MAX_IMAGE_BYTES
          ) {
            skipped += 1;
            continue;
          }
          const bytes = Buffer.from(await response.arrayBuffer());
          if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) {
            skipped += 1;
            continue;
          }
          const fingerprint = await createCatalogImageFingerprint(bytes);
          if (!fingerprint) {
            skipped += 1;
            continue;
          }
          await prisma.media.update({
            where: { id: item.id },
            data: fingerprint,
          });
          updated += 1;
        } catch (error) {
          skipped += 1;
          console.warn(`Could not fingerprint media ${item.id}: ${error.message}`);
        }
      }
    }),
  );
  console.log(`Fingerprint backfill complete: ${updated} updated, ${skipped} skipped.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
