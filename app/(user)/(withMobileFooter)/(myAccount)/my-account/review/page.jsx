import { getMyProductReviewData } from "@/backend/serverActions/customerReviewActions";
import CustomerProductReviews from "./CustomerProductReviews";

export const dynamic = "force-dynamic";

export default async function MyReviewsPage() {
  const result = await getMyProductReviewData();
  if (!result.success) return <main className="mx-auto max-w-5xl p-4"><div className="rounded-2xl border border-border bg-surface p-5 text-danger">{result.message}</div></main>;
  return <CustomerProductReviews initialData={result.data} />;
}
