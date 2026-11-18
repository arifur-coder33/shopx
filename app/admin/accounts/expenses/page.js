import { getProcurementSectionData } from "@/backend/serverActions/procurementQueryAction";
import FinancialDocuments from "../FinancialDocuments";

export const dynamic = "force-dynamic";

export default async function ExpensesPage({ searchParams }) {
  const filters = await searchParams;
  return <FinancialDocuments initialTab="expenses" result={await getProcurementSectionData("expenses", filters || {})} />;
}
