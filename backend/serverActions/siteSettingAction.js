"use server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cache } from "react";
import { cloudinaryDestroy, cloudinaryUpload } from "../utils/cloudinary";

const getCachedSiteSetting = cache(() => prisma.siteSetting.findFirst());

export async function getSiteSetting(params) {
  try {
    const data = params
      ? await prisma.siteSetting.findFirst({ ...params })
      : await getCachedSiteSetting();

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

  const getSetting = await prisma.siteSetting.findFirst();
  if (singleImage && singleImage?.size > 1) {
    const singleUploadedImage = await cloudinaryUpload({
      image: singleImage,
      tag: "logo",
      slug: "site",
      perifix: "_logo",
    });

    preparedData = {
      ...preparedData,
      logo: `${singleUploadedImage.display_name}.${singleUploadedImage.format}`,
    };

    if (getSetting?.logo && getSetting?.logo !== null) {
      await cloudinaryDestroy(getSetting?.logo);
    }
  }

  if (!getSetting) {
    const result = await prisma.siteSetting.create({
      data: preparedData,
    });
    revalidatePath("/admin/setting");
    revalidatePath("/");
    return { success: true, result };
  }
  if (getSetting) {
    const result = await prisma.siteSetting.update({
      where: { id: getSetting?.id },
      data: preparedData,
    });
    revalidatePath("/admin/setting");
    revalidatePath("/");
    return { success: true, result };
  }
}
