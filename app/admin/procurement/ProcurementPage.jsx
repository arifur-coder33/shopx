import { auth } from "@/auth";
import { getProcurementSectionData } from "@/backend/serverActions/procurementQueryAction";
import { hasUIPermission } from "@/lib/hasUIPermission.js";
import ProcurementManager from "./ProcurementManager";
import InventoryOperationsManager from "./InventoryOperationsManager";
import InventoryAssemblyManager from "./InventoryAssemblyManager";

export const procurementResources = {
  purchases: "purchase",
  receipts: "goodsReceipt",
};
export const inventoryResources = {
  stock: "inventory",
  ledger: "inventory",
  warehouses: "warehouse",
  deliveries: "delivery",
  transfers: "inventory",
  counts: "inventory",
  assembly: "inventory",
  reports: "inventory",
};

export default async function ProcurementPage({ section, filters = {}, area = "procurement" }) {
  const session = await auth();
  const permissions = session?.user?.permissions || [];
  const resources = area === "inventory" ? inventoryResources : procurementResources;
  const basePath = area === "inventory" ? "/admin/inventory" : "/admin/procurement";
  const allowedTabs = Object.entries(resources)
    .filter(([, resource]) => hasUIPermission(permissions, resource, "view"))
    .map(([tab]) => tab);
  if (!allowedTabs.length) {
    return <div className="card">You do not have permission to view purchasing or inventory.</div>;
  }

  const initialTab = allowedTabs.includes(section) ? section : allowedTabs[0];
  if (!initialTab) return <div className="card">You do not have permission to view this section.</div>;
  const result = await getProcurementSectionData(initialTab, filters);
  if (initialTab === "assembly") return <InventoryAssemblyManager initialResult={result} allowedTabs={allowedTabs} basePath={basePath} />;
  if (["transfers", "counts", "reports"].includes(initialTab)) return <InventoryOperationsManager initialResult={result} initialTab={initialTab} allowedTabs={allowedTabs} basePath={basePath} />;
  return <ProcurementManager initialResult={result} initialTab={initialTab} allowedTabs={allowedTabs} basePath={basePath} />;
}
