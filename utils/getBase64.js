import { unstable_cache } from "next/cache";
import { cloudinaryMainImage } from "./cloudinaryUrl";

// This function generates a tiny, blurred placeholder for an image.
// It's cached to ensure it only runs once per image.
export const getBase64ImageUrl = unstable_cache(
  async (imageId) => {
    try {
      // 1. Generate a URL for a tiny, low-quality, heavily-blurred image from Cloudinary
      const url = cloudinaryMainImage(imageId, 20, 20, "e_blur:1000,q_1");

      // 2. Fetch the tiny image
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch placeholder image: ${response.statusText}`
        );
      }

      // 3. Get the image as a buffer
      const buffer = await response.arrayBuffer();

      // 4. Convert the buffer to a Base64 string
      const base64 = Buffer.from(buffer).toString("base64");

      // 5. Format it as a data URL
      return `data:image/webp;base64,${base64}`;
    } catch (error) {
      console.error("Failed to generate Base64 URL:", error);
      // Return null or a default placeholder in case of an error
      return null;
    }
  },
  ["base64-images"] // Cache key prefix
);
