import cloudinary from "@/lib/cloudinary";
// export async function cloudinaryUpload({ image, tag, slug, perifix }) {
//   const imagebuffer = Buffer.from(await image.arrayBuffer());
//   const base64 = imagebuffer.toString("base64");
//   const formatimage = `data:${image.type};base64,${base64}`;
//   console.log(process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER)
//   const uploadResult = await cloudinary.uploader.upload(formatimage, {
//     folder: process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER,
//     public_id: slug + perifix + "_" + Date.now(),
//     tags: [process.env?.NEXT_SHOP_NAME, ...tag],
//   });

//   return uploadResult;
// }
function withTimeout(promise, ms = 15000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Upload timed out")), ms)
    ),
  ]);
}

import { Readable } from "stream";

export async function cloudinaryUpload({ image, tag, slug, perifix }) {
  const imageBuffer = Buffer.from(await image.arrayBuffer());

  const uploadStream = () =>
    new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER,
          public_id: slug + perifix + "_" + Date.now(),
          tags: [process.env?.NEXT_SHOP_NAME, ...tag],
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );

      Readable.from(imageBuffer).pipe(stream);
    });

  try {
    const result = await withTimeout(uploadStream(), 15000);
    return result;
  } catch (err) {
    console.error("Cloudinary timed out or failed:", err?.message || err);
    return null;
  }
}

export async function cloudinaryDestroy(publicId) {
  const getPublicId = publicId.split(".")[0];
  const folderName = process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER;
  const resourcePath = `${folderName}/${getPublicId}`;
  try {
    // Check if the resource exists
    const resource = await cloudinary.api.resource(resourcePath);
    console.log(resource);
    if (resource.placeholder) {
      console.log("Resource is a placeholder. No real asset exists.");
      return null;
    }
    const deleteResult = await cloudinary.uploader.destroy(resourcePath);
    console.log(deleteResult);
    if (deleteResult.result === "ok") {
      console.log("Image deleted successfully:", deleteResult);
      return deleteResult; // Return the successful delete response
    } else if (deleteResult.result === "not found") {
      console.log("Image not found, no deletion performed.");
      return; // Return null if the image is not found
    }
  } catch (error) {
    console.error("Error deleting image from Cloudinary:", error);
    throw new Error("Failed to delete the image");
  }
}

export async function deleteMultipleFile(files) {
  if (files.length > 0) {
    // const galleryImageIds = product.imageGallery.map(
    //   (image) => image.split(".")[0]
    // );
    await Promise.all(files.map((id) => cloudinaryDestroy(id)));
  }
  return;
}
