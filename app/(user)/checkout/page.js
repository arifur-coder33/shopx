import { getCheckoutProviders } from "@/backend/serverActions/providerConfigurationAction";
import CheckoutClient from "./_components/CheckoutClient";
import Breadcrumb from "@/components/common/Breadcrumb";

export const revalidate = 60;

export default async function CheckoutPage() {
  const checkoutProviders = await getCheckoutProviders();
  return (
    <>
      <Breadcrumb items={[{ label: "চেকআউট" }]} className="mb-2" />
      <CheckoutClient checkoutProviders={checkoutProviders} />
    </>
  );
}
