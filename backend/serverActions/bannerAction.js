"use server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
export async function getBanner() {
  try {
    const data = await prisma.banner.findFirst({
      select: {
        name: true,
        thumbnail: { select: { name: true } },
      },
    });

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

  const checkExistingData = await prisma.banner.findFirst();

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
