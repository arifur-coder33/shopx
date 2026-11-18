import ProcurementPage, { inventoryResources, procurementResources } from "../ProcurementPage";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page({ params, searchParams }) {
  const { section } = await params;
  const query = await searchParams;
  if (inventoryResources[section]) redirect(`/admin/inventory/${section}${query && Object.keys(query).length ? `?${new URLSearchParams(query).toString()}` : ""}`);
  if (section === "payments" || section === "expenses") redirect(`/admin/accounts/${section}${query && Object.keys(query).length ? `?${new URLSearchParams(query).toString()}` : ""}`);
  if (!procurementResources[section]) notFound();
  return <ProcurementPage section={section} filters={query || {}} />;
}
