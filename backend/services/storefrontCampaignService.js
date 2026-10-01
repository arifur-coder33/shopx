import { unstable_cache } from "next/cache";
import { getActiveCampaigns, getPublicCampaigns } from "./campaignService";

// Cache display data only. Checkout continues to evaluate live campaigns.
const readActiveCampaigns = unstable_cache(
  () => getActiveCampaigns(),
  ["storefront-active-campaigns-v1"],
  { revalidate: 60, tags: ["campaigns", "products", "categories"] },
);

export async function getStorefrontActiveCampaigns() {
  const campaigns = await readActiveCampaigns();
  const now = Date.now();
  return campaigns.map((campaign) => ({
    ...campaign,
    startAt: campaign.startAt ? new Date(campaign.startAt) : null,
    endAt: campaign.endAt ? new Date(campaign.endAt) : null,
  })).filter((campaign) =>
    (!campaign.startAt || new Date(campaign.startAt).getTime() <= now) &&
    (!campaign.endAt || new Date(campaign.endAt).getTime() >= now),
  );
}

export const getStorefrontCampaignHighlights = unstable_cache(
  () => getPublicCampaigns({ take: 3 }),
  ["storefront-campaign-highlights-v1"],
  { revalidate: 60, tags: ["campaigns", "products", "categories"] },
);
