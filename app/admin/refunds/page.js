import { getReturnRefundQueue } from "@/backend/serverActions/refundAction";
import ReturnRefundQueue from "./ReturnRefundQueue";

export const dynamic = "force-dynamic";

export default async function RefundsPage() {
  const result = await getReturnRefundQueue();
  if (!result.success) return <div className="card p-5 text-danger">{result.message}</div>;
  return <ReturnRefundQueue refunds={result.data.refunds} moneyAccounts={result.data.moneyAccounts} history={result.data.history} />;
}
