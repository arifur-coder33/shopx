import { auth } from "@/auth";
import { getProcurementSectionData } from "@/backend/serverActions/procurementQueryAction";
import { hasUIPermission } from "@/lib/hasUIPermission.js";
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
  const session = await auth();
  const permissions = session?.user?.permissions || [];
  const allowedTabs = Object.entries(procurementResources)
    .filter(([, resource]) => hasUIPermission(permissions, resource, "view"))
    .map(([tab]) => tab);
  if (!allowedTabs.length) {
    return <div className="card">You do not have permission to view purchasing or inventory.</div>;
  }

  const initialTab = allowedTabs.includes(section) ? section : allowedTabs[0];
  const result = await getProcurementSectionData(initialTab, filters);
  return <ProcurementManager initialResult={result} initialTab={initialTab} />;
}
