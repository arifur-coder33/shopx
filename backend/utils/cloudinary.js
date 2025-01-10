import cloudinary from "@/lib/cloudinary";
export async function cloudinaryUpload({ image, tag, slug, perifix }) {
  const uploadResult = await cloudinary.uploader.upload(image, {
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
