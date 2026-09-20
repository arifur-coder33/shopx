import AdminShell from "./AdminShell";
import { getSiteSetting } from "@/backend/serverActions/siteSettingAction";
import { requireAdminStoreEntry } from "@/backend/services/adminStoreAccess.server";
import { storeAuth } from "@/auth/store";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLayout({ children }) {
  const identity = await requireAdminStoreEntry();
  let storeMenuSlugs = null;
  if (identity === "STORE_MEMBER") {
    const session = await storeAuth();
    const permissions = await prisma.storeRolePermission.findMany({
      where: { roleId: session.user.roleId }, select: { resource: true, action: true },
    });
    const allowed = new Set(permissions.map(({ resource, action }) => `${resource}:${action}`));
    storeMenuSlugs = [
      ["accounts", "MONEY_ACCOUNT:VIEW"],
      ["accounts/ledger", "FINANCIAL_REPORT:VIEW"],
      ["accounts/shareholders", "MONEY_ACCOUNT:VIEW"],
      ["procurement/payments", "SUPPLIER_PAYMENT:VIEW"],
      ["procurement/expenses", "EXPENSE:VIEW"],
      ["pos", "POS:VIEW", "POS:CREATE"],
    ].filter(([, ...required]) => required.some((permission) => allowed.has(permission))).map(([slug]) => slug);
  }
  const { data: siteSetting } = await getSiteSetting();
  return <AdminShell siteSetting={siteSetting} identity={identity} storeMenuSlugs={storeMenuSlugs}>{children}</AdminShell>;
}
