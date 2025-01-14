'use server'
import prisma from "@/lib/prisma";
import { revalidatePath,  } from "next/cache";

export async function getNotice() {
  try {
    const data = await prisma.notice.findFirst();
    return { success: true, data: data };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function updateNotice(formData) {
  let data = Object.fromEntries(formData.entries());
  const formattedStart = data?.start ? new Date(data?.start).toISOString() : null;
const formattedEnd = data?.end ? new Date(data?.end).toISOString() : null;
  let preparedData = {
    ...data,
start:formattedStart,
end:formattedEnd
  
  };

      // Handle  image
    



  const checkExistingData = await prisma.notice.findFirst();

  if (!checkExistingData) {
   const result= await prisma.notice.create({
      data: preparedData,
    });
    revalidatePath("/");
    revalidatePath("/admin/notice");
    return { success: true, result };
  }
  if (checkExistingData) {
 

    const result= await prisma.notice.update({
      where:{id:checkExistingData?.id},
      data: preparedData,
    });
    revalidatePath("/admin/notice");
    revalidatePath("/");
    return { success: true, result };
  }
}
