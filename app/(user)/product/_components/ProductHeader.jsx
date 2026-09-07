// NO "use client". This is a Server Component.
import { getCheckoutProviders } from "@/backend/serverActions/providerConfigurationAction";
import EMISection from "./EMI/EMISection";
import ProductClientShell from "./ProductClientShell";
import WishlistButton from "@/components/wishlist/WishlistButton";

export default async function ProductHeader({ data, imageProps, children }) {
  const { title } = data;

  // The Server Component passes both the data and the server-rendered
  // components (as props) to the Client Component.
  const providers = await getCheckoutProviders();
  const sslActive = providers.gateways.some(
    (provider) => provider.code === "SSLCOMMERZ",
  );
  return (
    <>
      <ProductClientShell
        imageProps={imageProps}
        data={data}
        imageComponent={children} // The <Image> from page.js is passed here
        titleComponent={
          // The static h1 is created here on the server
          <div className="flex items-start gap-2 border-b-2 pb-2">
            <h1 key={title} className="min-w-0 flex-1 text-3xl font-bold sm:text-4xl">
              {title}
            </h1>
            <WishlistButton product={data} />
          </div>
        }
        bottomComponent={sslActive && <EMISection key="sslcommerz-emi" />}
      />
    </>
  );
}
