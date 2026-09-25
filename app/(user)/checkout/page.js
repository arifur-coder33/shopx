import { getCheckoutProviders } from "@/backend/serverActions/providerConfigurationAction";
import CheckoutClient from "./_components/CheckoutClient";
import Breadcrumb from "@/components/common/Breadcrumb";
import { getCheckoutDeliveryRates } from "@/backend/services/deliveryChargeService";
import { getCheckoutCampaignOffers } from "@/backend/services/campaignService";

export const revalidate = 60;

export default async function CheckoutPage() {
  const [checkoutProviders, deliveryRates, campaignOffers] = await Promise.all([getCheckoutProviders(), getCheckoutDeliveryRates(), getCheckoutCampaignOffers()]);
  return (
    <>
      <Breadcrumb items={[{ label: "চেকআউট" }]} className="mb-2" />
      <CheckoutClient checkoutProviders={checkoutProviders} deliveryRates={deliveryRates} campaignOffers={campaignOffers} />
    </>
  );
}
