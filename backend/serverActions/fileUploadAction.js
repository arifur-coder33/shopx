"use server";

import prisma from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { cloudinaryUpload } from "../utils/cloudinary";
import { newSlug } from "../utils/generateSlug";

export async function uploadImagesAction(formData) {
  try {
    let imageGalleryUploads = [];
    const imageGalleryFiles = formData.getAll("imageGallery");
    const validFiles = imageGalleryFiles.filter((file) => file.size > 0);
    console.log("imageGalleryFiles", imageGalleryFiles);
    console.log("validFiles", validFiles);
    if (validFiles.length > 0) {
      imageGalleryUploads = await Promise.all(
        validFiles.map(async (file, index) => {
          console.log("promisfile", file);
          try {
            const fileName = file.name;
            const slug =
              fileName.substring(0, fileName.lastIndexOf(".")) || fileName;

            if (!file) {
              console.error("No file found");
              return null;
            }
            const imageSlug = await newSlug(slug);
            // Ensure file is valid and properly passed to Cloudinary
            console.log("upload data", {
              image: file,
              tag: imageSlug,
              slug: `${imageSlug}_${index + 1}`,
              perifix: "_galleryImage",
            });
            const upload = await cloudinaryUpload({
              image: file,
              tag: imageSlug,
              slug: `${imageSlug}_${index + 1}`,
              perifix: "_galleryImage",
            });
            console.log("cloudinary upload response", upload);
            if (!upload || !upload.secure_url) {
              console.error("Cloudinary upload returned invalid data", upload);
              return null;
            }

            return {
              url: upload.secure_url,
              host: "cloudinary",
              name: `${upload.display_name}.${upload.format}`,
            };
          } catch (uploadError) {
            console.error("Cloudinary upload failed:", uploadError);
            return null;
          }
        })
      );

      imageGalleryUploads = imageGalleryUploads.filter((img) => img !== null);
    }
    console.log(imageGalleryUploads);
    if (imageGalleryUploads.length > 0) {
      await prisma.media.createMany({
        data: imageGalleryUploads,
      });
      revalidatePath("/admin/media");
      revalidateTag("media"); // ✅ Instead of revalidatePath()
      return { success: true, data: imageGalleryUploads };
    } else {
      return {
        success: false,
        message: "All image uploads failed due to timeout or errors.",
        data: [],
      };
    }
  } catch (error) {
    console.error("Image upload failed:", error);
    return {
      success: false,
      message: "Image upload failed. Please try again.",
    };
  }
}

export async function getAllMedia(params) {
  const data = await prisma.media.findMany();

  return { success: true, data };
}

export async function getAllMediaByIds(params) {
  const data = await prisma.media.findMany({
    where: {
      id: {
        in: params, // Assuming params.ids is an array of media IDs
      },
    },
  });

  return { success: true, data };
}
