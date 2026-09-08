"use server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireProcurementPermission } from "../utils/procurement";

const clean = (value) => String(value || "").trim();
const HERO_MOTIONS = new Set(["FADE", "ZOOM", "SLIDE_LEFT", "SLIDE_RIGHT"]);

const refreshHeroSlides = () => {
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
    const data = await prisma.heroSlide.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: heroSlideSelect,
    });
    return { success: true, data };
  } catch (error) {
    return { success: false, message: error.message, data: [] };
  }
}

export async function getHeroSlidesForAdmin() {
  try {
    await requireProcurementPermission("media", "view");
    const data = await prisma.heroSlide.findMany({
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
    const data = slideInput(formData);
    const image = await prisma.media.findUnique({ where: { id: data.imageId }, select: { id: true } });
    if (!image) throw new Error("Selected slider image was not found.");
    await prisma.heroSlide.create({ data });
    refreshHeroSlides();
    return { success: true, message: "Slider image added." };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function updateHeroSlide(formData) {
  try {
    await requireProcurementPermission("media", "update");
    const id = clean(formData.get("id"));
    if (!id) throw new Error("Slider ID is required.");
    const data = slideInput(formData);
    const [slide, image] = await Promise.all([
      prisma.heroSlide.findUnique({ where: { id }, select: { id: true } }),
      prisma.media.findUnique({ where: { id: data.imageId }, select: { id: true } }),
    ]);
    if (!slide) throw new Error("Slider image was not found.");
    if (!image) throw new Error("Selected slider image was not found.");
    await prisma.heroSlide.update({ where: { id }, data });
    refreshHeroSlides();
    return { success: true, message: "Slider image updated." };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function deleteHeroSlide(id) {
  try {
    await requireProcurementPermission("media", "delete");
    const slide = await prisma.heroSlide.findUnique({ where: { id }, select: { id: true } });
    if (!slide) throw new Error("Slider image was not found.");
    await prisma.heroSlide.delete({ where: { id } });
    refreshHeroSlides();
    return { success: true, message: "Slider image deleted." };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

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
