import { auth } from "@/auth";
import { getChatAiTeachingsAction } from "@/backend/serverActions/chatActions";
import { hasUIPermission } from "@/lib/hasUIPermission.js";
import AiTeachPage from "../_components/AiTeachPage";

export const metadata = { title: "Teach AI" };
export const dynamic = "force-dynamic";

export default async function TeachAiRoute() {
  const session = await auth();
  const permissions = session?.user?.permissions || [];
  if (!hasUIPermission(permissions, "aiTeach", "view")) return <div className="card p-5">Unauthorized</div>;
  const result = await getChatAiTeachingsAction();
  return <AiTeachPage initialTeachings={result.success ? result.data : []} initialError={result.success ? "" : result.message} canUpdate={hasUIPermission(permissions, "aiTeach", "update")} />;
}
