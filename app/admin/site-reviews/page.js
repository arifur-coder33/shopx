import { getPhotoReviewsForAdmin } from "@/backend/serverActions/photoReviewActions";
import SiteReviewsManager from "./SiteReviewsManager";

export const dynamic = "force-dynamic";

export default async function SiteReviewsPage() {
  const result = await getPhotoReviewsForAdmin();
  if (!result.success) return <main className="p-4"><div className="card p-5 text-danger">{result.message}</div></main>;
  return <SiteReviewsManager initialData={result.data} />;
}
