'use server'
import prisma from "@/lib/prisma";
import { revalidatePath,  } from "next/cache";
import {
  cloudinaryDestroy,
  cloudinaryUpload,

} from "../utils/cloudinary";

export async function getBanner() {
  try {
    const data = await prisma.banner.findFirst();
    return { success: true, data: data };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function homeBannerUpdate(formData) {
  let data = Object.fromEntries(formData.entries());
  let preparedData = {
    ...data,

  
  };

      // Handle  image
      const singleImage = formData.get("image");
    

      if (singleImage && singleImage.size>1) {
       const singleUploadedImage = await cloudinaryUpload({
          image: singleImage,
          tag: data?.name,
          slug:'home',
          perifix: "_banner",
        });

        preparedData={
          ...preparedData,
         image: `${singleUploadedImage.display_name}.${singleUploadedImage.format}`
          
        }
      }

  const checkExistingData = await prisma.banner.findFirst();
  console.log(preparedData)
  if (!checkExistingData) {
   const result= await prisma.banner.create({
      data: preparedData,
    });
    revalidatePath("/");
    revalidatePath("/admin/banner");
    return { success: true, result };
  }
  if (checkExistingData) {
    
    if (checkExistingData?.image && checkExistingData?.image!== null) {
    
      await cloudinaryDestroy(checkExistingData?.image);
    }
   
    const result= await prisma.banner.update({
      where:{id:checkExistingData?.id},
      data: preparedData,
    });
    revalidatePath("/admin/banner");
    revalidatePath("/");
    return { success: true, result };
  }
}
