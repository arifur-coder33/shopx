import { getCheckoutProviders } from "@/backend/serverActions/providerConfigurationAction";
import { registerCampaignSchedule } from "@/backend/services/storefrontScheduleService";
import { getCheckoutCampaignOffers } from "@/backend/services/campaignService";
import { getCheckoutDeliveryRates } from "@/backend/services/deliveryChargeService";
import Breadcrumb from "@/components/common/Breadcrumb";
import CheckoutClient from "./_components/CheckoutClient";

export const revalidate = false;

export default async function CheckoutPage() {
  await registerCampaignSchedule();
  const [checkoutProviders, deliveryRates, campaignOffers] = await Promise.all([
    getCheckoutProviders(),
    getCheckoutDeliveryRates(),
    getCheckoutCampaignOffers(),
  ]);
  return (
    <>
      <Breadcrumb items={[{ label: "চেকআউট" }]} className="mb-2" />
      <CheckoutClient
        checkoutProviders={checkoutProviders}
        deliveryRates={deliveryRates}
        campaignOffers={campaignOffers}
      />
    </>
  );
}
