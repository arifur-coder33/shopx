import { getStorefrontCampaignHighlights } from "@/backend/services/storefrontCampaignService";
import CampaignBannerGrid from "../../campaign/CampaignBannerGrid";

export default async function CampaignHighlights() {
  const campaigns = await getStorefrontCampaignHighlights();
  return <div className="mx-auto max-w-7xl px-3 sm:px-5"><CampaignBannerGrid campaigns={campaigns.slice(0, 2)} compact showAllLink={campaigns.length > 2} /></div>;
}
