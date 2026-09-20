import { getAdminAccess } from "@/backend/services/adminStoreAccess.server";
import { getPosPageData, getPosSales } from "@/backend/serverActions/posAction";
import PosManager from "./PosManager";

export const dynamic = "force-dynamic";

export default async function PosPage({ searchParams }) {
  const filters = (await searchParams) || {};
  const [createAccess, viewAccess, orderAccess] = await Promise.all([
    getAdminAccess("POS", "CREATE", "pos"),
    getAdminAccess("POS", "VIEW", "pos"),
    getAdminAccess("ORDER", "VIEW", "order"),
  ]);
  const canCreate = createAccess.allowed;
  const canView = viewAccess.allowed;
  const canViewOrders = orderAccess.allowed;
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
