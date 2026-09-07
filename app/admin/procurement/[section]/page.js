import ProcurementPage, { procurementResources } from "../ProcurementPage";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page({ params, searchParams }) {
  const { section } = await params;
  const query = await searchParams;
  if (!procurementResources[section]) notFound();
  return <ProcurementPage section={section} filters={query || {}} />;
}
