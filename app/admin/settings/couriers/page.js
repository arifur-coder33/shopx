import { getProviderConfiguration } from "@/backend/serverActions/providerConfigurationAction";
import ProviderManager from "../providers/ProviderManager";

export const dynamic = "force-dynamic";

export default async function CouriersPage({ searchParams }) {
  const filters = await searchParams;
  return <ProviderManager kind="courier" result={await getProviderConfiguration("courier", filters || {})} />;
}
