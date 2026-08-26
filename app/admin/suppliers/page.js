import { hasUIPermission } from "@/lib/hasUIPermission.js";

import { auth } from "@/auth";
import AdminListPage from "../_components/AdminListPage";
import { supplierConfig } from "./config";

export default async function SupplierListPage() {
  const session = await auth();

  if (!hasUIPermission(session.user.permissions, "supplier", "view")) {
    return <div>Unauthorized</div>;
  }
  return <AdminListPage {...supplierConfig} />;
}
