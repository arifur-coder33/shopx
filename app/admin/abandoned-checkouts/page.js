import { auth } from "@/auth";
import { hasUIPermission } from "@/lib/hasUIPermission.js";
import { getAbandonedCheckoutLeadsAction } from "@/backend/serverActions/abandonedCheckoutActions";
import AbandonedCheckoutLeads from "./AbandonedCheckoutLeads";

export const dynamic = "force-dynamic";

export default async function AbandonedCheckoutsPage() {
  const session = await auth();
  if (!hasUIPermission(session?.user?.permissions, "order", "view")) {
    return <div className="card">Unauthorized</div>;
  }
  const leads = await getAbandonedCheckoutLeadsAction();
  return <AbandonedCheckoutLeads initialLeads={leads} canDelete={hasUIPermission(session?.user?.permissions, "order", "update")} />;
}