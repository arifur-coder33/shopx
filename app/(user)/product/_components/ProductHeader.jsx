// NO "use client". This is a Server Component.
import { getCheckoutProviders } from "@/backend/serverActions/providerConfigurationAction";
import EMISection from "./EMI/EMISection";
import ProductClientShell from "./ProductClientShell";
import WishlistButton from "@/components/wishlist/WishlistButton";
import WishlistHydrationSync from "@/components/wishlist/WishlistHydrationSync";
import { Suspense } from "react";
import ProductInitialImage from "./ProductInitialImage";
import { CampaignOfferList } from "@/components/campaign/CampaignOfferList";
import ProductStaticGallery from "./ProductStaticGallery";
import ProductInfoServer from "./ProductInfoServer";

async function ProductEmiAvailability() {
  const providers = await getCheckoutProviders();
  const sslActive = providers.gateways.some(
    (provider) => provider.code === "SSLCOMMERZ",
  );
  return sslActive ? <EMISection /> : null;
}

export default function ProductHeader({ data, imageProps, campaignOffers = [] }) {
  const { title } = data;
  const variations = (data.variations || []).map((variation) => ({
    id: variation.id,
    sku: variation.sku,
    weight: variation.weight,
    regularPrice: variation.regularPrice,
    discountPrice: variation.discountPrice,
    campaignPrice: variation.campaignPrice,
    campaignName: variation.campaignName,
    stock: variation.stock,
    thumbnailId: variation.thumbnailId,
    thumbnail: variation.thumbnail
      ? { id: variation.thumbnail.id, name: variation.thumbnail.name }
      : null,
    combinations: (variation.combinations || []).map((combination) => ({
      variationName: {
        id: combination.variationName?.id,
        name: combination.variationName?.name,
      },
      variationValue: {
        id: combination.variationValue?.id,
        value: combination.variationValue?.value,
      },
    })),
  }));
  const regularPrices = variations
    .map((variation) => Number(variation.regularPrice))
    .filter((price) => Number.isFinite(price) && price > 0);
  const salePrices = variations
    .map((variation) => Number(variation.discountPrice))
    .filter((price) => Number.isFinite(price) && price > 0);
  const regularPrice = regularPrices.length ? Math.min(...regularPrices) : 0;
  const discountPrice = salePrices.length ? Math.min(...salePrices) : 0;
  const clientData = {
    id: data.id,
    categoryId: data.categoryId,
    title,
    slug: data.slug,
    weight: data.weight,
    hasVariations: Boolean(data.hasVariations),
    allowOutOfStockOrder: Boolean(data.allowOutOfStockOrder),
    stock: variations[0]?.stock || 0,
    category: data.category?.name
      ? { name: data.category.name }
      : data.category || "Uncategorized",
    thumbnail: data.thumbnail
      ? { id: data.thumbnail.id, name: data.thumbnail.name }
      : null,
    gallery: (data.gallery || []).map((image) => ({
      id: image.id,
      name: image.name,
    })),
    videos: (data.videos || []).map((video) => ({
      id: video.id,
      header: video.header,
      url: video.url,
    })),
    videoUrl: data.videoUrl,
    variations,
  };
  const wishlistProduct = {
    id: data.id,
    slug: data.slug,
    title,
    regularPrice,
    discountPrice:
      discountPrice > 0 && (!regularPrice || discountPrice < regularPrice)
        ? discountPrice
        : 0,
    thumbnail: clientData.thumbnail,
    hasVariations: clientData.hasVariations,
  };

  const initialImage = <ProductInitialImage imageId={imageProps.initialSrc} alt={imageProps.alt} />;
  const titleComponent = (
    <div className="flex items-start gap-3 border-b border-border pb-3">
      <h1 className="min-w-0 flex-1 text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl">{title}</h1>
      <WishlistButton product={wishlistProduct} />
    </div>
  );
  const bottomComponent = <><CampaignOfferList campaigns={campaignOffers} title="এই পণ্যে চলমান অফার" /><Suspense fallback={null}><ProductEmiAvailability /></Suspense></>;

  return (
    <>
      <ProductClientShell
        key={data.id}
        imageProps={imageProps}
        data={clientData}
        initialImage={initialImage}
        titleComponent={titleComponent}
        bottomComponent={bottomComponent}
        initialContent={<>
          <div className="min-w-0 md:col-span-1"><ProductStaticGallery data={clientData} initialImage={initialImage} /></div>
          <div className="min-w-0 rounded-2xl bg-surface p-3 sm:p-5 md:col-span-1">
            {titleComponent}
            <ProductInfoServer product={clientData} />
            {bottomComponent}
          </div>
        </>}
      />
      <WishlistHydrationSync />
    </>
  );
}
