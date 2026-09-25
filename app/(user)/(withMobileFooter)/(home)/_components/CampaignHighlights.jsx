import { getPublicCampaigns } from "@/backend/services/campaignService";
import CampaignBannerGrid from "../../campaign/CampaignBannerGrid";

export default async function CampaignHighlights() {
  const campaigns = await getPublicCampaigns();
  return <div className="mx-auto max-w-7xl px-3 sm:px-5"><CampaignBannerGrid campaigns={campaigns} showAllLink /></div>;
}
