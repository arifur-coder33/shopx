import { auth } from "@/auth";
import { hasUIPermission } from "@/lib/hasUIPermission.js";
import { revalidatePath } from "next/cache";

export const PROCUREMENT_PATHS = ["purchases", "receipts"];
export const INVENTORY_PATHS = ["stock", "ledger", "warehouses", "deliveries", "transfers", "counts", "assembly", "reports"];
export const PROCUREMENT_RESOURCES = {
  purchases: "purchase",
  receipts: "goodsReceipt",
  stock: "inventory",
  ledger: "inventory",
  warehouses: "warehouse",
  payments: "supplierPayment",
  expenses: "expense",
  deliveries: "delivery",
  transfers: "inventory",
  counts: "inventory",
  assembly: "inventory",
  reports: "inventory",
};
export const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
export const toDate = (value) => (value ? new Date(value) : new Date());
export const actionError = (error, fallback) => ({ success: false, message: error instanceof Error ? error.message : fallback });
export const refreshProcurement = () => {
  PROCUREMENT_PATHS.forEach((section) => revalidatePath(`/admin/procurement/${section}`));
  INVENTORY_PATHS.forEach((section) => revalidatePath(`/admin/inventory/${section}`));
  revalidatePath("/admin/accounts");
  revalidatePath("/admin/accounts/payments");
  revalidatePath("/admin/accounts/expenses");
};
export async function requireProcurementPermission(resource, action) {
  const session = await auth();
  if (!hasUIPermission(session?.user?.permissions, resource, action)) throw new Error("You do not have permission to perform this action.");
  return session.user.id;
}
