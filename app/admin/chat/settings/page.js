import { auth } from "@/auth";
import { getChatSettingsAction } from "@/backend/serverActions/chatActions";
import { hasUIPermission } from "@/lib/hasUIPermission.js";
import { getSiteUrl } from "@/lib/siteUrl";
import ChatSettingsForm from "../_components/ChatSettingsForm";

export const metadata = { title: "Chat Settings" };
export const dynamic = "force-dynamic";

export default async function ChatSettingsPage() {
  const session = await auth();
  const permissions = session?.user?.permissions || [];
  if (!hasUIPermission(permissions, "chat", "view")) return <div className="card p-5">Unauthorized</div>;
  const result = await getChatSettingsAction();
  if (!result.success) return <div className="card p-5">{result.message}</div>;
  const siteUrl = await getSiteUrl();
  return <ChatSettingsForm settings={result.data} canUpdate={hasUIPermission(permissions, "chat", "update")} webhookUrl={new URL("/api/webhooks/meta-chat", siteUrl).toString()} tiktokWebhookUrl={new URL("/api/webhooks/tiktok-chat", siteUrl).toString()} encryptionReady={Boolean(process.env.PROVIDER_CREDENTIAL_ENCRYPTION_KEY?.length >= 32)} />;
}
