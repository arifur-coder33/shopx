import cloudinary from "@/lib/cloudinary";
import { toBase64 } from "@/utils/toBase64";
export async function cloudinaryUpload({ image, tag, slug, perifix }) {


    const imagebuffer = Buffer.from(await image.arrayBuffer());
    const base64 = imagebuffer.toString("base64");
    const formatimage=  `data:${image.type};base64,${base64}`
  const uploadResult = await cloudinary.uploader.upload(formatimage, {
    folder: process.env.CLOUDINARY_FOLDER,
    public_id: slug + perifix,
    tags: [tag],
  });

  return uploadResult;
}

export async function cloudinaryDestroy(publicId) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
  });
}
