import { auth } from "@/auth";
import { getSeoSettingsForAdmin } from "@/backend/serverActions/seoAction";
import { hasUIPermission } from "@/lib/hasUIPermission.js";
import { getSiteUrl } from "@/lib/siteUrl";
import SeoManager from "./SeoManager";

export const metadata = { title: "SEO Settings" };
export const dynamic = "force-dynamic";

export default async function SeoPage() {
  const session = await auth();
  const permissions = session?.user?.permissions || [];
  if (!hasUIPermission(permissions, "seoSettings", "view")) {
    return <div className="card p-5">Unauthorized</div>;
  }

  const result = await getSeoSettingsForAdmin();
  if (!result.success) return <div className="card p-5">{result.message}</div>;

  return <SeoManager initialData={result.data} siteUrl={getSiteUrl()} />;
}
