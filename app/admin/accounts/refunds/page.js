import { getApprovedReturnRefunds } from "@/backend/serverActions/refundAction";
import RefundDisbursement from "./RefundDisbursement";

export const dynamic = "force-dynamic";

export default async function RefundDisbursementPage() {
  const result = await getApprovedReturnRefunds();
  if (!result.success) return <div className="card p-5 text-danger">{result.message}</div>;
  return <RefundDisbursement refunds={result.data.refunds} moneyAccounts={result.data.moneyAccounts} history={result.data.history} />;
}
