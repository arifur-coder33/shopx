// utils/cloudinaryUrl.js
export const DEFAULT_BLUR_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

export function cloudinaryMainImage(publicId, widthHint, heightHint) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName || !publicId) {
    // Fallback to a transparent pixel or minimal placeholder to avoid errors
    return "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  }

  // Cap the delivered image at its display width and preserve its source aspect ratio.
  // Avoid dpr_auto here: it can multiply small card widths into oversized downloads.
  const widthTransform = widthHint ? `c_limit,w_${widthHint},` : "";

  return `https://res.cloudinary.com/${cloudName}/image/upload/${widthTransform}f_auto,q_auto:eco/${process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER}/${publicId}`;
}

// export function cloudinaryMainImage(imageName, width, height) {
//   return `https://res.cloudinary.com/shopzarif/image/upload/w_${width},h_${height},f_auto,q_auto,dpr_auto/shopzy/${imageName}`;
// }

// https://res.cloudinary.com/shopzarif/image/upload
export function cloudinaryBlurImage(imageName) {
  return `https://res.cloudinary.com/bdmart24/image/upload/e_blur:200,w_10/f_auto,q_auto/bdmart24/${imageName}`;
}

// Use this for responsive <picture> sources. Each URL has a real pixel width,
// so a small screen never downloads the desktop banner through dpr_auto.
export function cloudinaryResponsiveImage(publicId, width, quality = "eco") {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const folder = process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER;

  if (!cloudName || !publicId || !width) {
    return DEFAULT_BLUR_DATA_URL;
  }

  const qualityMode = quality === "good" ? "good" : "eco";
  return `https://res.cloudinary.com/${cloudName}/image/upload/c_limit,w_${width},f_auto,q_auto:${qualityMode}/${folder}/${publicId}`;
}

// Product-detail media uses a higher-quality transform than small cards.
// c_limit preserves aspect ratio and never enlarges a smaller source image.
export function cloudinaryDetailImage(publicId, width = 1200) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const folder = process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER;

  if (!cloudName || !publicId) return DEFAULT_BLUR_DATA_URL;

  return `https://res.cloudinary.com/${cloudName}/image/upload/c_limit,w_${width},f_auto,q_auto:good/${folder}/${publicId}`;
}

export function cloudinaryOriginalImage(publicId) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const folder = process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER;
  if (!cloudName || !publicId) return DEFAULT_BLUR_DATA_URL;
  return `https://res.cloudinary.com/${cloudName}/image/upload/${folder ? `${folder}/` : ""}${publicId}`;
}

// export function cloudinaryMainImage(imageName) {
//   const urlGen =  `https://res.cloudinary.com/bdmart24/image/upload/bdmart24/`+imageName;
// console.log(urlGen)
//   return urlGen;
// }

// This function fetches a tiny version of the image and returns its Base64 data URL
export async function getBase64ImageUrl(imageId) {
  try {
    // Generate a URL for a tiny, low-quality version of the image for the blur
    const url = cloudinaryMainImage(imageId, 10, 10, 20); // 10px wide, 20 quality

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    // Return the standard Base64 Data URL format
    return `data:${response.headers.get("content-type")};base64,${base64}`;
  } catch (error) {
    console.error("Failed to generate Base64 URL:", error);
    // Return a transparent pixel as a fallback
    return DEFAULT_BLUR_DATA_URL;
  }
}
