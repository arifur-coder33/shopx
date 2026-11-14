import { auth } from "@/auth";
import { getEmailConfigurationAction } from "@/backend/serverActions/emailSupportAction";
import { hasUIPermission } from "@/lib/hasUIPermission.js";
import { getSiteUrl } from "@/lib/siteUrl";
import EmailConfigurationForm from "./EmailConfigurationForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Email Configuration" };

export default async function EmailConfigurationPage() {
  const session = await auth();
  const permissions = session?.user?.permissions || [];
  if (!hasUIPermission(permissions, "chatSettings", "view")) return <div className="card p-5">Unauthorized</div>;
  const result = await getEmailConfigurationAction();
  if (!result.success) return <div className="card p-5 text-danger">{result.message}</div>;
  const webhookUrl = new URL("/api/webhooks/resend", await getSiteUrl()).toString();
  return <EmailConfigurationForm initial={result.data} webhookUrl={webhookUrl} canUpdate={hasUIPermission(permissions, "chatSettings", "update")} encryptionReady={Boolean(process.env.PROVIDER_CREDENTIAL_ENCRYPTION_KEY?.length >= 32)} />;
}
