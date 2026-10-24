import sharp from "sharp";

const HASH_DIMENSION = 8;

function pixelsToHash(pixels, width, height, compareAdjacent = false) {
  const bits = [];
  if (compareAdjacent) {
    for (let y = 0; y < height; y += 1) {
      // The extra pixel in each row is only the right-hand comparison pixel,
      // so each row contributes eight bits (64 bits total).
      for (let x = 0; x < width - 1; x += 1) {
        bits.push(pixels[y * width + x] > pixels[y * width + x + 1]);
      }
    }
  } else {
    const average = pixels.reduce((total, value) => total + value, 0) / pixels.length;
    for (const value of pixels) bits.push(value >= average);
  }

  let hash = 0n;
  for (const bit of bits) hash = (hash << 1n) | (bit ? 1n : 0n);
  return hash.toString(16).padStart(16, "0");
}

export async function createImageFingerprint(input) {
  try {
    const { data } = await sharp(input, { failOn: "none" })
      .rotate()
      .flatten({ background: "white" })
      .greyscale()
      .resize(HASH_DIMENSION + 1, HASH_DIMENSION, {
        fit: "fill",
        kernel: "lanczos3",
      })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const pixels = [...data];
    const rows = Array.from({ length: HASH_DIMENSION }, (_, index) =>
      pixels.slice(index * (HASH_DIMENSION + 1), (index + 1) * (HASH_DIMENSION + 1)),
    );
    const dHashPixels = rows.flat();
    const aHashPixels = rows.map((row) => row.slice(0, HASH_DIMENSION)).flat();
    return {
      imageDifferenceHash: pixelsToHash(dHashPixels, HASH_DIMENSION + 1, HASH_DIMENSION, true),
      imageAverageHash: pixelsToHash(aHashPixels, HASH_DIMENSION, HASH_DIMENSION),
    };
  } catch (error) {
    console.warn("Image fingerprint could not be created:", error?.message || error);
    return null;
  }
}

export function fingerprintDistance(left, right) {
  if (!/^[\da-f]{16}$/iu.test(String(left || "")) || !/^[\da-f]{16}$/iu.test(String(right || "")))
    return Infinity;
  let bits = BigInt(`0x${left}`) ^ BigInt(`0x${right}`);
  let distance = 0;
  while (bits) {
    distance += Number(bits & 1n);
    bits >>= 1n;
  }
  return distance;
}
