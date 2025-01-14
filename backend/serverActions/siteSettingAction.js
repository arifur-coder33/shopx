'use server'
import prisma from "@/lib/prisma";
import { revalidatePath,  } from "next/cache";
import {
  cloudinaryDestroy,
  cloudinaryUpload,

} from "../utils/cloudinary";

export async function getSiteSetting() {
  try {
    const data = await prisma.siteSetting.findFirst();
    return { success: true, data: data };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function siteSettingUpdate(formData) {
  let data = Object.fromEntries(formData.entries());
  let preparedData = {
    ...data,
  
  };

      // Handle  image
      const singleImage = formData.get("logo");
    console.log(singleImage)
      const getSetting = await prisma.siteSetting.findFirst();
      if (singleImage && singleImage?.size>1) {
       const singleUploadedImage = await cloudinaryUpload({
          image: singleImage,
          tag: 'logo',
          slug:'site',
          perifix: "_logo",
        });

        preparedData={
          ...preparedData,
         logo: `${singleUploadedImage.display_name}.${singleUploadedImage.format}`
          
        }

        if (getSetting?.logo && getSetting?.logo!== null) {
          await cloudinaryDestroy(getSetting?.logo);
        }
      }
  


  if (!getSetting) {
   const result= await prisma.siteSetting.create({
      data: preparedData,
    });
    revalidatePath("/admin/setting");
    return { success: true, result };
  }
  if (getSetting) {
    console.log("enter1")
 
    console.log(getSetting)
    const result= await prisma.siteSetting.update({
      where:{id:getSetting?.id},
      data: preparedData,
    });
    revalidatePath("/admin/setting");
    return { success: true, result };
  }
}
