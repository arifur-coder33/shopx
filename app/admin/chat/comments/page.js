import { auth } from "@/auth";
import { getFacebookPageCommentsAction } from "@/backend/serverActions/chatActions";
import { hasUIPermission } from "@/lib/hasUIPermission.js";
import FacebookCommentsPage from "../_components/FacebookCommentsPage";

export const metadata = { title: "Facebook & Instagram Comments" };
export const dynamic = "force-dynamic";

export default async function FacebookPageCommentsRoute() {
  const session = await auth();
  const permissions = session?.user?.permissions || [];
  const canView = hasUIPermission(permissions, "chat", "view");
  if (!canView) return <div className="card p-5">Unauthorized</div>;
  const result = await getFacebookPageCommentsAction({ limit: 100 });
  return <FacebookCommentsPage initialComments={result.success ? result.data : []} initialError={result.success ? "" : result.message} canUpdate={hasUIPermission(permissions, "chat", "update")} />;
}
