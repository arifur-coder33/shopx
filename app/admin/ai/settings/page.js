import { auth } from "@/auth";
import { getChatSettingsAction } from "@/backend/serverActions/chatActions";
import { hasUIPermission } from "@/lib/hasUIPermission.js";
import AiSettingsForm from "../_components/AiSettingsForm";

export const metadata = { title: "AI Settings" };
export const dynamic = "force-dynamic";

export default async function AiSettingsPage() {
  const session = await auth();
  const permissions = session?.user?.permissions || [];
  if (!hasUIPermission(permissions, "chat", "view")) return <div className="card p-5">Unauthorized</div>;
  const result = await getChatSettingsAction();
  if (!result.success) return <div className="card p-5">{result.message}</div>;
  return <AiSettingsForm settings={result.data} canUpdate={hasUIPermission(permissions, "chat", "update")} />;
}
