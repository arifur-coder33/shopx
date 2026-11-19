// NO "use client". This is a Server Component.
import { getCheckoutProviders } from "@/backend/serverActions/providerConfigurationAction";
import ProductClientShell from "./ProductClientShell";
import WishlistButton from "@/components/wishlist/WishlistButton";
import WishlistHydrationSync from "@/components/wishlist/WishlistHydrationSync";
import ProductInitialImage from "./ProductInitialImage";
import { CampaignOfferList } from "@/components/campaign/CampaignOfferList";
import ProductStaticGallery from "./ProductStaticGallery";
import ProductInfoServer from "./ProductInfoServer";
import ProductShareButton from "@/components/products/ProductShareButton";

export default async function ProductHeader({ data, imageProps, campaignOffers = [], sizeChart }) {
  const providers = await getCheckoutProviders();
  const emi = providers.gateways.find((provider) => provider.adapterKey === "SSLCOMMERZ" && provider.emi?.enabled)?.emi || null;
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
    bundleContents: variation.bundleContents,
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
    sizeChart,
    emi,
    id: data.id,
    categoryId: data.categoryId,
    title,
    slug: data.slug,
    weight: data.weight,
    hasVariations: Boolean(data.hasVariations),
    stockMode: data.stockMode,
    bundleOptions: data.bundleOptions,
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
    <div className="border-b border-border pb-3">
      <h1 className="inline break-words text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl">{title}</h1>{" "}
      <div className="ml-1 inline-flex items-center gap-2 align-middle">
        <WishlistButton product={wishlistProduct} />
        <ProductShareButton title={title} />
      </div>
    </div>
  );
  const bottomComponent = <CampaignOfferList campaigns={campaignOffers} title="এই পণ্যে চলমান অফার" />;

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
