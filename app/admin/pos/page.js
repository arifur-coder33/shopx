import { auth } from "@/auth";
import { getPosPageData, getPosSales } from "@/backend/serverActions/posAction";
import { hasUIPermission } from "@/lib/hasUIPermission.js";
import { redirect } from "next/navigation";
import PosManager from "./PosManager";

export const dynamic = "force-dynamic";

export default async function PosPage({ searchParams }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/admin/pos");
  const filters = (await searchParams) || {};
  const permissions = session.user.permissions || [];
  const canCreate = hasUIPermission(permissions, "pos", "create");
  const canView = hasUIPermission(permissions, "pos", "view");
  const canViewOrders = hasUIPermission(permissions, "order", "view");
  const allowed = filters.tab === "sales" ? canView : canCreate;
  if (!allowed) {
    return <div className="card">Unauthorized</div>;
  }
  const [result, salesResult] = await Promise.all([
    getPosPageData(filters),
    filters.tab === "sales" ? getPosSales(filters) : Promise.resolve(null),
  ]);
  return <PosManager result={result} salesResult={salesResult} canCreate={canCreate} canView={canView} canViewOrders={canViewOrders} />;
}
