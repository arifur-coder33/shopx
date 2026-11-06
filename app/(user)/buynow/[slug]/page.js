import {
  getStorefrontCheckoutProductBySlug,
  getStorefrontProductSlugs,
} from "@/backend/services/storefrontProductService";
import { getCheckoutDeliveryRates } from "@/backend/services/deliveryChargeService";
import { getCheckoutCampaignOffers } from "@/backend/services/campaignService";
import { getCheckoutProviders } from "@/backend/serverActions/providerConfigurationAction";
import { registerCampaignSchedule } from "@/backend/services/storefrontScheduleService";


import { Suspense } from "react";
import BuyNowCheckout from "./_components/BuyNowCheckout";
import Breadcrumb from "@/components/common/Breadcrumb";
export const revalidate = false;
export const dynamic = "force-static";
export const dynamicParams = true;

export async function generateStaticParams() {
  const { data: products = [] } = await getStorefrontProductSlugs();

  return products.map((product) => ({
    slug: product.slug,
  }));
}

export default async function BuyNowPage({ params }) {
  await registerCampaignSchedule();
  const { slug } = await params;

  const [product, deliveryRates, checkoutProviders, campaignOffers] = await Promise.all([
    getStorefrontCheckoutProductBySlug(slug),
    getCheckoutDeliveryRates(),
    getCheckoutProviders(),
    getCheckoutCampaignOffers(),
  ]);
  if (!product?.success || !product.data) {
    throw new Error(product?.error || "Product could not be loaded.");
  }

  const data = product.data;

  return (
    <div className="pt-4">
      <Breadcrumb
        items={[
          ...(data.category?.name
            ? [
                {
                  label: data.category.name,
                  href: `/category/${
                    data.category.fullPath || data.category.slug
                  }`,
                },
              ]
            : []),
          { label: data.title, href: `/product/${data.slug}` },
          { label: "অর্ডার করুন" },
        ]}
        className="mb-2"
      />
      <Suspense>
        <BuyNowCheckout
          data={data}
          deliveryRates={deliveryRates}
          checkoutProviders={checkoutProviders}
          campaignOffers={campaignOffers}

        />
      </Suspense>
    </div>
  );
}
