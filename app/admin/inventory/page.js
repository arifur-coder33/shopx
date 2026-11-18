import ProcurementPage from "../procurement/ProcurementPage";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }) {
  const query = await searchParams;
  return <ProcurementPage area="inventory" filters={query || {}} />;
}
