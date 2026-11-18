import ProcurementPage, { inventoryResources } from "../../procurement/ProcurementPage";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page({ params, searchParams }) {
  const { section } = await params;
  const query = await searchParams;
  if (!inventoryResources[section]) notFound();
  return <ProcurementPage area="inventory" section={section} filters={query || {}} />;
}
