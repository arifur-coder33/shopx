import prisma from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { requireCurrentStoreId } from "./storeContextService";

const clean = (value) => String(value || "").trim();

export function normalizeContactDetails(setting) {
  return {
    facebookPage: clean(setting?.fbLink),
    messenger: clean(setting?.messengerLink),
    whatsappNumber: clean(setting?.whatsappNumber),
    phoneNumber: clean(setting?.phoneNumber1),
    email: clean(setting?.email),
  };
}

async function queryContactDetails(storeId) {
  const setting = await prisma.siteSetting.findUnique({
    where: { storeId },
    select: {
      fbLink: true,
      messengerLink: true,
      whatsappNumber: true,
      phoneNumber1: true,
      email: true,
    },
  });
  return normalizeContactDetails(setting);
}

const getCachedContactDetails = (storeId) =>
  unstable_cache(
    () => queryContactDetails(storeId),
    ["public-contact-details", storeId],
    {
      revalidate: 300,
      tags: [`contact-details:${storeId}`, `site-setting:${storeId}`],
    },
  )();

export async function getPublicContactDetails() {
  const storeId = await requireCurrentStoreId();
  return process.env.NODE_ENV === "development"
    ? queryContactDetails(storeId)
    : getCachedContactDetails(storeId);
}
