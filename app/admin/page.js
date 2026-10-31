import { auth } from "@/auth";
import { hasUIPermission } from "@/lib/hasUIPermission.js";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!hasUIPermission(session?.user?.permissions, "dashboard", "view")) {
    return <div className="card p-5">Unauthorized</div>;
  }
  return <div>Admin Dash board</div>;
}
