import { getMoneyManagement } from "@/backend/serverActions/moneyAccountAction";
import AccountManager from "./AccountManager";

export const dynamic = "force-dynamic";

export default async function AccountsPage({ searchParams }) {
  const filters = await searchParams;
  return <AccountManager result={await getMoneyManagement(filters || {})} />;
}
