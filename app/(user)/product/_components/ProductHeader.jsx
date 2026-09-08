// NO "use client". This is a Server Component.
import { getCheckoutProviders } from "@/backend/serverActions/providerConfigurationAction";
import EMISection from "./EMI/EMISection";
import ProductClientShell from "./ProductClientShell";
import WishlistButton from "@/components/wishlist/WishlistButton";
import WishlistHydrationSync from "@/components/wishlist/WishlistHydrationSync";
import { Suspense } from "react";

async function ProductEmiAvailability() {
  const providers = await getCheckoutProviders();
  const sslActive = providers.gateways.some(
    (provider) => provider.code === "SSLCOMMERZ",
  );
  return sslActive ? <EMISection /> : null;
}

export default function ProductHeader({ data, imageProps }) {
  const { title } = data;

  return (
    <>
      <ProductClientShell
        imageProps={imageProps}
        data={data}
        titleComponent={
          // The static h1 is created here on the server
          <div className="flex items-start gap-3 border-b border-border pb-3">
            <h1
              key={title}
              className="min-w-0 flex-1 text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl"
            >
              {title}
            </h1>
            <WishlistButton product={data} />
          </div>
        }
        bottomComponent={
          <Suspense fallback={null}>
            <ProductEmiAvailability />
          </Suspense>
        }
      />
      <WishlistHydrationSync />
    </>
  );
}
