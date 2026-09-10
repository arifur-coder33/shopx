import { getSiteAppearanceForAdmin } from "@/backend/serverActions/siteSettingAction";
import SiteAppearanceForm from "./SiteAppearanceForm";

export const dynamic = "force-dynamic";

export default async function SiteAppearancePage() {
  const result = await getSiteAppearanceForAdmin();
  if (!result.success) {
    return <div className="card p-5 text-danger">{result.message}</div>;
  }
  return <SiteAppearanceForm initialSettings={result.data} />;
}

