import { auth } from "@/auth";
import { hasUIPermission } from "@/lib/hasUIPermission.js";
import { getRecentOrdersForAdmin } from "@/backend/serverActions/orderActions";
import Orders2Client from "./Orders2Client";

export const dynamic = "force-dynamic";

export default async function Orders2Page() {
  const session = await auth();
  if (!hasUIPermission(session?.user?.permissions, "order", "view")) {
    return <div className="card">Unauthorized</div>;
  }
  const result = await getRecentOrdersForAdmin({ limit: 50, status: "PENDING", includeUnseenCount: true });
  return <Orders2Client initialOrders={result.orders} initialHasMore={result.hasMore} initialUnseenCount={result.unseenCount || 0} viewerId={session.user.id} canUpdate={hasUIPermission(session?.user?.permissions, "order", "update")} />;
}
