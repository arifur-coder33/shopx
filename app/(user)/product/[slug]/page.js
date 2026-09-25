import { getPublicSiteIdentity } from "@/backend/services/siteAppearanceService";
import {
  getStorefrontProductBySlug,
  getStorefrontProductSlugs,
} from "@/backend/services/storefrontProductService";
import { buildProductSeo } from "@/backend/utils/productSeo";
import { applyProductCampaign, getActiveCampaigns, toCampaignDisplayData } from "@/backend/services/campaignService";
import Breadcrumb from "@/components/common/Breadcrumb";
import JsonLd from "@/components/seo/JsonLd";
import { getSiteUrl } from "@/lib/siteUrl";
import { DEFAULT_BLUR_DATA_URL } from "@/utils/cloudinaryUrl";
import { notFound } from "next/navigation";
import ProductDataView from "../_components/ProductDataView";

export const revalidate = 60;
export const dynamic = "force-static";
export const dynamicParams = true;

const compact = (value, length) => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > length ? `${text.slice(0, length - 1).trim()}…` : text;
};

const productContext = async (slug) => {
  const [result, identity, siteUrl] = await Promise.all([
    getStorefrontProductBySlug(slug),
    getPublicSiteIdentity(),
    getSiteUrl(),
  ]);
  if (!result?.success || !result.data) {
    return { result, identity, siteUrl, seo: null };
  }
  return {
    result,
    identity,
    siteUrl,
    seo: buildProductSeo({
      product: result.data,
      siteUrl,
      siteName: identity.name,
    }),
  };
};

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { result, identity, siteUrl, seo } = await productContext(slug);

  if (!result?.success || !seo) {
    return {
      title: "পণ্য পাওয়া যায়নি",
      description: "আপনি যে পণ্যটি খুঁজছেন সেটি পাওয়া যায়নি।",
      alternates: { canonical: `${siteUrl}/product/${encodeURIComponent(slug)}` },
      robots: { index: false, follow: false },
    };
  }

  const product = result.data;
  const priceLabel = seo.lowestPrice
    ? `৳${new Intl.NumberFormat("bn-BD", { maximumFractionDigits: 2 }).format(seo.lowestPrice)}`
    : "";
  const title = compact(
    [product.title, priceLabel, product.category?.name].filter(Boolean).join(" - "),
    65,
  );
  const description = compact(seo.description, 160);
  const keywords = Array.from(
    new Set(
      [
        product.title,
        product.category?.name,
        ...String(product.seoKeyWord || "").split(","),
      ]
        .map((item) => String(item || "").trim())
        .filter(Boolean),
    ),
  );
  const productVideos = (product.videos || [])
    .map((video) => String(video.url || "").trim())
    .filter((url) => /^https?:\/\//i.test(url));

  return {
    title: { absolute: compact(`${title} | ${identity.name}`, 65) },
    description,
    keywords,
    alternates: { canonical: seo.url },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title,
      description,
      url: seo.url,
      siteName: identity.name,
      type: "website",
      locale: "bn_BD",
      images: seo.images.slice(0, 4).map((url, index) => ({
        url,
        width: 1200,
        height: 1200,
        alt: index === 0 ? product.title : `${product.title} - ছবি ${index + 1}`,
      })),
      ...(productVideos.length && {
        videos: productVideos.map((url) => ({ url })),
      }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [seo.images[0]],
    },
    other: {
      ...(seo.lowestPrice && {
        "product:price:amount": String(seo.lowestPrice),
        "product:price:currency": "BDT",
      }),
      "product:availability": seo.availability,
      "product:condition": "new",
      "product:retailer_item_id": String(product.productCode || product.id),
      ...(product.category?.name && { "product:category": product.category.name }),
    },
    publisher: identity.name,
  };
}

export async function generateStaticParams() {
  const { data: products = [] } = await getStorefrontProductSlugs();
  return products.map((product) => ({ slug: product.slug }));
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const { result, seo } = await productContext(slug);
  if (!result?.success || !seo) notFound();
  const data = result.data;
  const activeCampaigns = await getActiveCampaigns();
  const productCampaigns = activeCampaigns.filter((campaign) => {
    const config = campaign.configuration || {};
    const comboProductIds = (config.productPairs || []).flatMap((pair) => [
      ...(pair.requiredProductIds || (pair.requiredProductId ? [pair.requiredProductId] : [])),
      ...(pair.rewardProductIds || (pair.rewardProductId ? [pair.rewardProductId] : [])),
    ]);
    const hasTargets = campaign.products?.length || campaign.categories?.length || comboProductIds.length;
    return !hasTargets ||
      campaign.products?.some((target) => target.productId === data.id) ||
      campaign.categories?.some((target) => target.categoryId === data.categoryId) ||
      comboProductIds.includes(data.id);
  });
  const campaignOffers = productCampaigns.map(toCampaignDisplayData);
  const variationsWithCampaigns = data.variations.map((variation) => {
    const regular = Number(variation.regularPrice) || 0;
    const sale = Number(variation.discountPrice) > 0 && Number(variation.discountPrice) < regular
      ? Number(variation.discountPrice)
      : regular;
    const pricing = applyProductCampaign({
      campaigns: productCampaigns,
      productId: data.id,
      categoryId: data.categoryId,
      basePrice: sale,
    });
    return { ...variation, campaignPrice: pricing.campaign ? pricing.price : null, campaignName: pricing.campaign?.name || null };
  });

  return (
    <div className="mb-16 pb-20 sm:pb-0">
      <JsonLd data={seo.structuredData} />
      <Breadcrumb
        items={[
          ...(data.category?.name
            ? [{
                label: data.category.name,
                href: `/category/${data.category.fullPath || data.category.slug}`,
              }]
            : []),
          { label: data.title },
        ]}
      />
      <ProductDataView data={{ ...data, variations: variationsWithCampaigns }} campaignOffers={campaignOffers} blurDataURL={DEFAULT_BLUR_DATA_URL} />
    </div>
  );
}
