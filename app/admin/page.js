import { getAdminAccess } from "@/backend/services/adminStoreAccess.server";

export default async function AdminDashboardPage() {
  const access = await getAdminAccess("STORE", "VIEW", "accounting");
  if (access.identity === "STORE_MEMBER" && !access.allowed) return <div className="card">Unauthorized</div>;
  return <div>Admin Dash board</div>;
}
