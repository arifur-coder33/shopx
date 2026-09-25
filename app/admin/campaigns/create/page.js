import { hasPermission } from "@/backend/utils/hasPermission";
import CampaignForm from "../components/CampaignForm";
import { getCampaignEditorOptions } from "../campaignPageData";

export const dynamic = "force-dynamic";

export default async function CreateCampaignPage() {
  await hasPermission("campaign", "create");
  const options = await getCampaignEditorOptions();
  return <div className="mx-auto max-w-5xl space-y-4 p-3 sm:p-5"><h1 className="text-2xl font-bold">Create campaign</h1><CampaignForm {...options} /></div>;
}
