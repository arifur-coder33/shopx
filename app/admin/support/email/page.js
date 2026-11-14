import { auth } from "@/auth";
import { hasUIPermission } from "@/lib/hasUIPermission.js";
import EmailSupportInbox from "./EmailSupportInbox";

export const dynamic = "force-dynamic";
export const metadata = { title: "Email Inbox" };

export default async function EmailSupportPage() {
  const session = await auth();
  const permissions = session?.user?.permissions || [];
  if (!hasUIPermission(permissions, "chatInbox", "view")) return <div className="card p-5">Unauthorized</div>;
  return <EmailSupportInbox canUpdate={hasUIPermission(permissions, "chatInbox", "update")} />;
}
