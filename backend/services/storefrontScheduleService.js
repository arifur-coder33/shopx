import prisma from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { storefrontScheduleWindow } from "@/lib/storefrontSchedule.mjs";

const readCampaignSchedules = unstable_cache(
  () => prisma.campaign.findMany({ where: { status: "PUBLISHED" }, select: { startAt: true, endAt: true } }),
  ["storefront-campaign-schedules-v1"],
  { revalidate: false, tags: ["campaigns"] },
);

export async function registerScheduleWindow(records, key, tags) {
  const window = storefrontScheduleWindow(records);
  // A cached marker registers the next transition with Next's Full Route Cache.
  // The epoch changes after each boundary, so old display data is not reused.
  await unstable_cache(async () => null, [key, window.epoch], { revalidate: window.revalidate, tags })();
  return window;
}

export async function registerCampaignSchedule() {
  return registerScheduleWindow(await readCampaignSchedules(), "storefront-campaign-clock-v1", ["campaigns"]);
}

export async function readScheduledCampaignData(loader, keys, tags, args = []) {
  const window = await registerCampaignSchedule();
  return unstable_cache(loader, [...keys, window.epoch], { revalidate: window.revalidate, tags })(...args);
}
