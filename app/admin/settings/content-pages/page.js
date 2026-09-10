import { getContentPagesForAdmin } from "@/backend/serverActions/contentPageAction";
import ContentPagesManager from "./ContentPagesManager";

export const dynamic = "force-dynamic";

export default async function ContentPagesAdminPage() {
  const result = await getContentPagesForAdmin();
  if (!result.success) {
    return <div className="card p-5 text-danger">{result.message}</div>;
  }
  return <ContentPagesManager initialPages={result.data} />;
}

