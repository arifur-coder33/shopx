import prisma from "@/lib/prisma";

export async function getSiteSetting() {
  try {
    const data = await prisma.siteSetting.findFirst();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function siteSettingUpdate(formData) {
  let data = Object.fromEntries(formData.entries());
  let preparedData = {
    ...data,
  };
  const checkData = await prisma.siteSetting.findFirst();
  if (!checkData) {
    await prisma.siteSetting.create({
      data: preparedData,
    });
  }
}
