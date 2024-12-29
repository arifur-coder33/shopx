import cloudinary from "@/lib/cloudinary"
export async function cloudinaryUpload({image,tag,slug,perifix}) {
      const uploadResult = await cloudinary.uploader.upload(image, {
            folder: process.env.CLOUDINARY_FOLDER,
            public_id: slug + perifix,
            tags: [tag],
          });

          return uploadResult
}