import { getPublicCampaigns } from "@/backend/services/campaignService";
import CampaignBannerGrid from "../../campaign/CampaignBannerGrid";

export default async function CampaignHighlights() {
  const campaigns = await getPublicCampaigns({ take: 3 });
  return <div className="mx-auto max-w-7xl px-3 sm:px-5"><CampaignBannerGrid campaigns={campaigns.slice(0, 2)} compact showAllLink={campaigns.length > 2} /></div>;
}
