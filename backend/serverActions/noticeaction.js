"use server";
import prisma from "@/lib/prisma";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { requireCurrentStoreId } from "@/backend/services/storeContextService";

export async function getNotice() {
  try {
    const storeId = await requireCurrentStoreId();
    const data = await unstable_cache(
      () => prisma.notice.findFirst({ where: { storeId } }),
      ["storefront-notice", storeId],
      { revalidate: 60, tags: [`storefront-notice:${storeId}`] },
    )();
    return { success: true, data: data };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function updateNotice(formData) {
  const storeId = await requireCurrentStoreId();
  let data = Object.fromEntries(formData.entries());
  const formattedStart = data?.start
    ? new Date(data?.start).toISOString()
    : null;
  const formattedEnd = data?.end ? new Date(data?.end).toISOString() : null;
  let preparedData = {
    ...data,
    start: formattedStart,
    end: formattedEnd,
  };

  // Handle  image

  const checkExistingData = await prisma.notice.findFirst({ where: { storeId } });

  if (!checkExistingData) {
    const result = await prisma.notice.create({
      data: { ...preparedData, storeId },
    });
    revalidateTag(`storefront-notice:${storeId}`);
    revalidatePath("/");
    revalidatePath("/admin/notice");
    return { success: true, result };
  }
  if (checkExistingData) {
    const result = await prisma.notice.update({
      where: { id: checkExistingData?.id, storeId },
      data: preparedData,
    });
    revalidateTag(`storefront-notice:${storeId}`);
    revalidatePath("/admin/notice");
    revalidatePath("/");
    return { success: true, result };
  }
}
