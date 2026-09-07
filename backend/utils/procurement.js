import { auth } from "@/auth";
import { hasUIPermission } from "@/lib/hasUIPermission.js";
import { revalidatePath } from "next/cache";

export const PROCUREMENT_PATHS = ["purchases", "receipts", "stock", "ledger", "warehouses", "payments", "expenses", "deliveries"];
export const PROCUREMENT_RESOURCES = {
  purchases: "purchase",
  receipts: "goodsReceipt",
  stock: "inventory",
  ledger: "inventory",
  warehouses: "warehouse",
  payments: "supplierPayment",
  expenses: "expense",
  deliveries: "delivery",
};
export const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
export const toDate = (value) => (value ? new Date(value) : new Date());
export const actionError = (error, fallback) => ({ success: false, message: error instanceof Error ? error.message : fallback });
export const refreshProcurement = () => PROCUREMENT_PATHS.forEach((section) => revalidatePath(`/admin/procurement/${section}`));
export async function requireProcurementPermission(resource, action) {
  const session = await auth();
  if (!hasUIPermission(session?.user?.permissions, resource, action)) throw new Error("You do not have permission to perform this action.");
  return session.user.id;
}
