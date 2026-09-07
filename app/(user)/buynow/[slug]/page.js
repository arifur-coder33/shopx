import {
  getStorefrontProductBySlug,
  getStorefrontProductSlugs,
} from "@/backend/services/storefrontProductService";
import { getCheckoutDeliveryRates } from "@/backend/services/deliveryChargeService";
import { getCheckoutProviders } from "@/backend/serverActions/providerConfigurationAction";

import { Suspense } from "react";
import BuyNowCheckout from "./_components/BuyNowCheckout";
import Breadcrumb from "@/components/common/Breadcrumb";
export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  const { data: products = [] } = await getStorefrontProductSlugs();

  return products.map((product) => ({
    slug: product.slug,
  }));
}

export default async function BuyNowPage({ params }) {
  const { slug } = await params;

  const product = await getStorefrontProductBySlug(slug);
  if (!product?.success || !product.data) {
    throw new Error(product?.error || "Product could not be loaded.");
  }

  const [deliveryRates, checkoutProviders] = await Promise.all([
    getCheckoutDeliveryRates(),
    getCheckoutProviders(),
  ]);
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
        />
      </Suspense>
    </div>
  );
}
