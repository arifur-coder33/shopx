import ProcurementDetailPage from "../../../procurement/ProcurementDetailPage";

export const dynamic = "force-dynamic";

export default function InventoryDetailPage({ params }) {
  return <ProcurementDetailPage params={params} basePath="/admin/inventory" />;
}
