import { createCatalogImageFingerprint } from "@/backend/services/imageFingerprint";
import prisma from "@/lib/prisma";

function hamming(first, second) {
  let bits = first ^ second;
  let count = 0;
  while (bits) {
    bits &= bits - 1n;
    count += 1;
  }
  return count;
}

function fingerprintScore(target, media) {
  if (!media?.imageDifferenceHash || !media?.imageAverageHash) return null;
  try {
    const difference = hamming(
      BigInt(`0x${target.imageDifferenceHash}`),
      BigInt(`0x${media.imageDifferenceHash}`),
    );
    const average = hamming(
      BigInt(`0x${target.imageAverageHash}`),
      BigInt(`0x${media.imageAverageHash}`),
    );
    // Perceptual hashes only identify duplicates and near-duplicates. Camera
    // photos and heavily cropped screenshots are handled by the vision search.
    return difference <= 10 && average <= 16
      ? difference + average
      : null;
  } catch {
    return null;
  }
}

export async function findMatchingCatalogImage(customerImage) {
  if (!customerImage?.base64) return null;
  const target = await createCatalogImageFingerprint(
    Buffer.from(customerImage.base64, "base64"),
  );
  if (!target) return null;

  // Product images are fingerprinted when uploaded/backfilled, so customer
  // requests never download hundreds of catalog images from Cloudinary.
  const products = await prisma.product.findMany({
    where: { isActive: true, status: "ACTIVE" },
    select: {
      id: true,
      thumbnail: {
        select: { imageDifferenceHash: true, imageAverageHash: true },
      },
      gallery: {
        select: {
          media: {
            select: { imageDifferenceHash: true, imageAverageHash: true },
          },
        },
      },
      variations: {
        select: {
          thumbnail: {
            select: { imageDifferenceHash: true, imageAverageHash: true },
          },
        },
      },
    },
  });

  let winner = null;
  for (const product of products) {
    const media = [
      product.thumbnail,
      ...product.gallery.map((item) => item.media),
      ...product.variations.map((variant) => variant.thumbnail),
    ];
    for (const image of media) {
      const score = fingerprintScore(target, image);
      if (score !== null && (!winner || score < winner.score)) {
        winner = { productId: product.id, score };
      }
    }
  }
  return winner?.productId || null;
}
