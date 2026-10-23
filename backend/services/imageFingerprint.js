import sharp from "sharp";

export async function createCatalogImageFingerprint(input) {
  try {
    const source = sharp(input, { limitInputPixels: 30_000_000 }).rotate();
    const metadata = await source.metadata();
    if (!metadata.width || !metadata.height) return null;

    const horizontal = await source
      .clone()
      .resize(9, 8, { fit: "fill" })
      .grayscale()
      .raw()
      .toBuffer();
    const average = await source
      .clone()
      .resize(8, 8, { fit: "fill" })
      .grayscale()
      .raw()
      .toBuffer();
    let differenceHash = 0n;
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        differenceHash =
          (differenceHash << 1n) |
          BigInt(horizontal[y * 9 + x] > horizontal[y * 9 + x + 1] ? 1 : 0);
      }
    }
    const mean = average.reduce((total, pixel) => total + pixel, 0) / average.length;
    let averageHash = 0n;
    for (const pixel of average) {
      averageHash = (averageHash << 1n) | BigInt(pixel >= mean ? 1 : 0);
    }
    return {
      imageDifferenceHash: differenceHash.toString(16).padStart(16, "0"),
      imageAverageHash: averageHash.toString(16).padStart(16, "0"),
    };
  } catch {
    return null;
  }
}
