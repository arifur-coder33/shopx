import { getReturnReceivingData } from "@/backend/serverActions/returnReceivingAction";
import ReturnReceivingManager from "./ReturnReceivingManager";

export const dynamic = "force-dynamic";

export default async function ReturnReceivingPage() {
  const result = await getReturnReceivingData();
  if (!result.success) return <div className="card p-5 text-danger">{result.message}</div>;
  return <ReturnReceivingManager data={result.data} />;
}
