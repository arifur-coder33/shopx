"use server";
import prisma from "@/lib/prisma";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { registerScheduleWindow } from "@/backend/services/storefrontScheduleService";

const readCachedNotice = unstable_cache(
  () => prisma.notice.findFirst(),
  ["storefront-notice-v1"],
  { revalidate: false, tags: ["notice"] },
);
export async function getNotice() {
  try {
    const data = await (process.env.NODE_ENV === "development"
      ? prisma.notice.findFirst()
      : readCachedNotice());
    await registerScheduleWindow(data ? [{ startAt: data.start, endAt: data.end }] : [], "storefront-notice-clock-v1", ["notice"]);
    return { success: true, data: data };
  } catch (error) {
    throw error;
  }
}

export async function updateNotice(formData) {
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

  const checkExistingData = await prisma.notice.findFirst();

  if (!checkExistingData) {
    const result = await prisma.notice.create({
      data: preparedData,
    });
    revalidatePath("/");
    revalidatePath("/admin/notice");
    revalidateTag("notice");
    return { success: true, result };
  }
  if (checkExistingData) {
    const result = await prisma.notice.update({
      where: { id: checkExistingData?.id },
      data: preparedData,
    });
    revalidatePath("/admin/notice");
    revalidateTag("notice");
    revalidatePath("/");
    return { success: true, result };
  }
}
