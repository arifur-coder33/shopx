"use server";
import prisma from "@/lib/prisma";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { requireProcurementPermission } from "../utils/procurement";
import { requireCurrentStoreId } from "../services/storeContextService";

const clean = (value) => String(value || "").trim();
const HERO_MOTIONS = new Set(["FADE", "ZOOM", "SLIDE_LEFT", "SLIDE_RIGHT"]);

const refreshHeroSlides = (storeId) => {
  revalidateTag(`storefront-hero:${storeId}`);
  revalidatePath("/");
  revalidatePath("/admin/banner");
};

function optionalLink(value) {
  const link = clean(value);
  if (!link) return null;
  if (link.startsWith("/")) return link;
  try {
    const url = new URL(link);
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
  } catch {}
  throw new Error("Link must start with / or be a valid http/https URL.");
}

function slideInput(formData) {
  const values = Object.fromEntries(formData.entries());
  const imageId = clean(values.image);
  if (!imageId) throw new Error("Slider image is required.");
  const requestedMotion = clean(values.motion).toUpperCase();
  return {
    title: clean(values.title) || null,
    link: optionalLink(values.link),
    sortOrder: Number.isFinite(Number(values.sortOrder)) ? Number(values.sortOrder) : 0,
    isActive: values.isActive !== "false",
    motion: HERO_MOTIONS.has(requestedMotion) ? requestedMotion : "FADE",
    imageId,
  };
}

const heroSlideSelect = {
  id: true,
  title: true,
  link: true,
  sortOrder: true,
  isActive: true,
  motion: true,
  image: { select: { id: true, name: true } },
};

export async function getActiveHeroSlides() {
  try {
    const storeId = await requireCurrentStoreId();
    const data = await unstable_cache(
      () => prisma.heroSlide.findMany({
        where: { storeId, isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: heroSlideSelect,
      }),
      ["storefront-hero", storeId],
      { revalidate: 60, tags: [`storefront-hero:${storeId}`] },
    )();
    return { success: true, data };
  } catch (error) {
    return { success: false, message: error.message, data: [] };
  }
}

export async function getHeroSlidesForAdmin() {
  try {
    await requireProcurementPermission("media", "view");
    const storeId = await requireCurrentStoreId();
    const data = await prisma.heroSlide.findMany({
      where: { storeId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: heroSlideSelect,
    });
    return { success: true, data };
  } catch (error) {
    return { success: false, message: error.message, data: [] };
  }
}

export async function createHeroSlide(formData) {
  try {
    await requireProcurementPermission("media", "create");
    const storeId = await requireCurrentStoreId();
    const data = slideInput(formData);
    const image = await prisma.media.findUnique({ where: { id: data.imageId, storeId }, select: { id: true } });
    if (!image) throw new Error("Selected slider image was not found.");
    await prisma.heroSlide.create({ data: { ...data, storeId } });
    refreshHeroSlides(storeId);
    return { success: true, message: "Slider image added." };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function updateHeroSlide(formData) {
  try {
    await requireProcurementPermission("media", "update");
    const storeId = await requireCurrentStoreId();
    const id = clean(formData.get("id"));
    if (!id) throw new Error("Slider ID is required.");
    const data = slideInput(formData);
    const [slide, image] = await Promise.all([
      prisma.heroSlide.findUnique({ where: { id, storeId }, select: { id: true } }),
      prisma.media.findUnique({ where: { id: data.imageId, storeId }, select: { id: true } }),
    ]);
    if (!slide) throw new Error("Slider image was not found.");
    if (!image) throw new Error("Selected slider image was not found.");
    await prisma.heroSlide.update({ where: { id, storeId }, data });
    refreshHeroSlides(storeId);
    return { success: true, message: "Slider image updated." };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function deleteHeroSlide(id) {
  try {
    await requireProcurementPermission("media", "delete");
    const storeId = await requireCurrentStoreId();
    const slide = await prisma.heroSlide.findUnique({ where: { id, storeId }, select: { id: true } });
    if (!slide) throw new Error("Slider image was not found.");
    await prisma.heroSlide.delete({ where: { id, storeId } });
    refreshHeroSlides(storeId);
    return { success: true, message: "Slider image deleted." };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function getBanner() {
  try {
    const storeId = await requireCurrentStoreId();
    const data = await prisma.banner.findFirst({
      where: { storeId },
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
  const storeId = await requireCurrentStoreId();
  let data = Object.fromEntries(formData.entries());
  let preparedData = {
    ...data,
  };

  const checkExistingData = await prisma.banner.findFirst({ where: { storeId } });
  const media = await prisma.media.findUnique({
    where: { id: preparedData.thumbnail, storeId },
    select: { id: true },
  });
  if (!media) throw new Error("Selected banner image was not found for this Store.");

  if (!checkExistingData) {
    const result = await prisma.banner.create({
      data: {
        ...preparedData,
        storeId,
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
      where: { id: checkExistingData?.id, storeId },
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
