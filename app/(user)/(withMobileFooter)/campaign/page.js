import CampaignBannerGrid from "./CampaignBannerGrid";
import { getPublicCampaigns } from "@/backend/services/campaignService";

export const revalidate = 60;

export default async function CampaignPage() {
  const campaigns = await getPublicCampaigns();
  return <main className="mx-auto max-w-7xl px-3 py-5 sm:px-5 sm:py-8">
    <CampaignBannerGrid campaigns={campaigns} title="সব ক্যাম্পেইন" />
    {!campaigns.length && <div className="rounded-2xl border border-border bg-surface p-8 text-center"><h1 className="text-2xl font-bold">এখন কোনো চলমান ক্যাম্পেইন নেই</h1><p className="mt-2 text-sm text-text-muted">নতুন অফার এলে এখানে দেখা যাবে।</p></div>}
  </main>;
}
