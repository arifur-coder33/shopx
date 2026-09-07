import { getShareholders } from "@/backend/serverActions/moneyAccountAction";
import ShareholderManager from "./ShareholderManager";

export const dynamic = "force-dynamic";

export default async function ShareholdersPage({ searchParams }) {
  const filters = await searchParams;
  return <ShareholderManager result={await getShareholders(filters || {})} />;
}
