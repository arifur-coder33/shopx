import { auth } from "@/auth";
import { getChatInboxAction } from "@/backend/serverActions/chatActions";
import { hasUIPermission } from "@/lib/hasUIPermission.js";
import AdminChatInbox from "./_components/AdminChatInbox";

export const metadata = { title: "Chat Inbox" };
export const dynamic = "force-dynamic";

export default async function ChatInboxPage() {
  const session = await auth();
  const permissions = session?.user?.permissions || [];
  if (!hasUIPermission(permissions, "chatInbox", "view")) return <div className="card p-5">Unauthorized</div>;
  const result = await getChatInboxAction({ status: "OPEN" });
  return <AdminChatInbox initialConversations={result.success ? result.data : []} canUpdate={hasUIPermission(permissions, "chatInbox", "update")} initialError={result.success ? "" : result.message} />;
}
