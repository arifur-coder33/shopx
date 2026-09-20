import { auth } from "@/auth";
import { storeAuth } from "@/auth/store";
import { hasStoreMemberCookie } from "@/backend/services/adminStoreAccess.server.js";
import { requireStorePermission } from "@/backend/services/identityAuthorization.server.js";
import { hasUIPermission } from "@/lib/hasUIPermission.js.js";
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

// Only these migrated actions accept StoreMember permissions. Other callers
// remain on legacy User RBAC until their resource permissions are designed.
const STORE_ACTION_PERMISSIONS = Object.freeze({
  "warehouse:create": ["WAREHOUSE", "CREATE"],
  "inventory:update": ["INVENTORY", "UPDATE"],
  "purchase:create": ["PURCHASE_ORDER", "CREATE"],
  "purchase:update": ["PURCHASE_ORDER", "UPDATE"],
  "goodsReceipt:create": ["GOODS_RECEIPT", "CREATE"],
  "supplierPayment:create": ["SUPPLIER_PAYMENT", "CREATE"],
  "supplierPayment:view": ["SUPPLIER_PAYMENT", "VIEW"],
  "accounting:view": ["MONEY_ACCOUNT", "VIEW"],
  "accounting:create": ["MONEY_ACCOUNT", "CREATE"],
  "accounting:update": ["MONEY_ACCOUNT", "UPDATE"],
  "accounting:delete": ["MONEY_ACCOUNT", "DELETE"],
  "moneyTransaction:create": ["MONEY_TRANSACTION", "POST"],
  "financialReport:view": ["FINANCIAL_REPORT", "VIEW"],
  "expense:view": ["EXPENSE", "VIEW"],
  "expense:create": ["EXPENSE", "CREATE"],
  "expense:update": ["EXPENSE", "UPDATE"],
  "expense:delete": ["EXPENSE", "DELETE"],
  "pos:view": ["POS", "VIEW"],
  "pos:create": ["POS", "CREATE"],
  "payment:create": ["PAYMENT", "CREATE"],
  "refund:create": ["REFUND", "CREATE"],
  "purchase:view": ["PURCHASE_ORDER", "VIEW"],
});

export async function requireProcurementPermission(resource, action, legacyResource = resource) {
  const permission = STORE_ACTION_PERMISSIONS[`${resource}:${action}`];
  if (await hasStoreMemberCookie()) {
    const storeSession = await storeAuth();
    if (!storeSession?.user || !permission) throw new Error("You do not have permission to perform this action.");
    await requireStorePermission(...permission, { getSession: async () => storeSession });
    return storeSession.user.storeMemberId;
  }

  // Compatibility path: legacy User sessions keep their existing resource:
  // action permissions. For migrated actions, a present StoreMember session
  // never falls back here, including when Store authorization fails.
  const session = await auth();
  if (!hasUIPermission(session?.user?.permissions, legacyResource, action)) throw new Error("You do not have permission to perform this action.");
  return session.user.id;
}
