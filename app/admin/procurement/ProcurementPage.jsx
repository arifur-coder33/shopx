import { getAdminAccess, hasStoreMemberCookie } from "@/backend/services/adminStoreAccess.server";
import { getProcurementSectionData } from "@/backend/serverActions/procurementQueryAction";
import ProcurementManager from "./ProcurementManager";

export const procurementResources = {
  purchases: "purchase",
  receipts: "goodsReceipt",
  stock: "inventory",
  ledger: "inventory",
  warehouses: "warehouse",
  payments: "supplierPayment",
  expenses: "expense",
  deliveries: "delivery",
};

export default async function ProcurementPage({ section = "purchases", filters = {} }) {
  const storeMember = await hasStoreMemberCookie();
  const entries = await Promise.all(Object.entries(procurementResources).map(async ([tab, resource]) => {
    if (storeMember && !["payments", "expenses"].includes(tab)) return null;
    const permission = tab === "payments" ? "SUPPLIER_PAYMENT" : "EXPENSE";
    const access = await getAdminAccess(permission, "VIEW", resource);
    return access.allowed ? tab : null;
  }));
  const allowedTabs = entries.filter(Boolean);
  if (!allowedTabs.length) {
    return <div className="card">You do not have permission to view purchasing or inventory.</div>;
  }

  const initialTab = allowedTabs.includes(section) ? section : allowedTabs[0];
  const result = await getProcurementSectionData(initialTab, filters);
  return <ProcurementManager initialResult={result} initialTab={initialTab} />;
}
