import cloudinary from "@/lib/cloudinary"
export async function cloudinaryUpload({image,tag,slug}) {
      const uploadResult = await cloudinary.uploader.upload(image, {
            folder: "shopzy",
            public_id: slug + "_mainImage",
            tags: [tag],
          });

          return uploadResult
}