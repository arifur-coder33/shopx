import { auth } from "@/auth";
import { getPosPageData, getPosSales } from "@/backend/serverActions/posAction";
import { hasUIPermission } from "@/lib/hasUIPermission.js";
import { redirect } from "next/navigation";
import PosManager from "./PosManager";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "POS",
  applicationName: "Shop POS",
  manifest: "/pos.webmanifest",
  appleWebApp: { capable: true, title: "POS", statusBarStyle: "black-translucent" },
};

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
  if (!filters.warehouseId && result?.success && result.data?.warehouses?.length) {
    const defaultWarehouse = result.data.warehouses.find((item) => item.isDefault) || result.data.warehouses[0];
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (typeof value === "string" && value) query.set(key, value);
    }
    query.set("warehouseId", defaultWarehouse.id);
    redirect(`/admin/pos?${query.toString()}`);
  }
  return <PosManager result={result} salesResult={salesResult} canCreate={canCreate} canView={canView} canViewOrders={canViewOrders} />;
}
