import prisma from "@/lib/prisma";
import { unstable_cache } from "next/cache";

const clean = (value) => String(value || "").trim();

export function normalizeContactDetails(setting) {
  return {
    facebookPage: clean(setting?.fbLink),
    instagram: clean(setting?.instagramLink),
    tiktok: clean(setting?.tiktokLink),
    messenger: clean(setting?.messengerLink),
    whatsappNumber: clean(setting?.whatsappNumber),
    phoneNumber: clean(setting?.phoneNumber1),
    email: clean(setting?.email),
  };
}

async function queryContactDetails() {
  const setting = await prisma.siteSetting.findFirst({
    select: {
      fbLink: true,
      instagramLink: true,
      tiktokLink: true,
      messengerLink: true,
      whatsappNumber: true,
      phoneNumber1: true,
      email: true,
    },
  });
  return normalizeContactDetails(setting);
}

const getCachedContactDetails = unstable_cache(
  queryContactDetails,
  ["public-contact-details"],
  { revalidate: 300, tags: ["contact-details", "site-setting"] },
);

export function getPublicContactDetails() {
  return process.env.NODE_ENV === "development"
    ? queryContactDetails()
    : getCachedContactDetails();
}
