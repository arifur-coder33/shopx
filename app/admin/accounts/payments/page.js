import { getProcurementSectionData } from "@/backend/serverActions/procurementQueryAction";
import FinancialDocuments from "../FinancialDocuments";

export const dynamic = "force-dynamic";

export default async function SupplierPaymentsPage({ searchParams }) {
  const filters = await searchParams;
  return <FinancialDocuments initialTab="payments" result={await getProcurementSectionData("payments", filters || {})} />;
}
