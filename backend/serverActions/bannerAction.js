"use server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
export async function getBanner() {
  try {
    console.time("getBanner DB Query");
    const data = await prisma.banner.findFirst({
      include: {
        thumbnail: true,
      },
    });
    console.timeEnd("getBanner DB Query");
    return { success: true, data: data };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function homeBannerUpdate({ formData }) {
  let data = Object.fromEntries(formData.entries());
  let preparedData = {
    ...data,
  };
  console.log("formData", data);

  const checkExistingData = await prisma.banner.findFirst();
  console.log(preparedData);
  if (!checkExistingData) {
    const result = await prisma.banner.create({
      data: {
        ...preparedData,
        thumbnail: {
          connect: { id: preparedData.thumbnail }, // Connect to existing Media
        },
      },
    });
    revalidatePath("/");
    revalidatePath("/admin/banner");
    return { success: true, result };
  }
  if (checkExistingData) {
    const result = await prisma.banner.update({
      where: { id: checkExistingData?.id },
      data: {
        ...preparedData,
        thumbnail: {
          connect: { id: preparedData.thumbnail }, // Connect to existing Media
        },
      },
    });
    revalidatePath("/admin/banner");
    revalidatePath("/");
    return { success: true, result };
  }
}
