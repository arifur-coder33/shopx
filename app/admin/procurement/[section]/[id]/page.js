import ProcurementDetailPage from "../../ProcurementDetailPage";

export const dynamic = "force-dynamic";

export default function Page({ params }) {
  return <ProcurementDetailPage params={params} />;
}
