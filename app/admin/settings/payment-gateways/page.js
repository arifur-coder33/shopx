import { getProviderConfiguration } from "@/backend/serverActions/providerConfigurationAction";
import ProviderManager from "../providers/ProviderManager";

export const dynamic = "force-dynamic";

export default async function PaymentGatewaysPage({ searchParams }) {
  const filters = await searchParams;
  return <ProviderManager kind="gateway" result={await getProviderConfiguration("gateway", filters || {})} />;
}
