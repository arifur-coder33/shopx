import {
  applyProductCampaign,
  selectCampaignsByPriority,
  toCampaignDisplayData,
} from "@/backend/services/campaignService";
import { getPublishedProductPhotoReviews } from "@/backend/services/photoReviewService";
import { getPublicSiteIdentity } from "@/backend/services/siteAppearanceService";
import { getStorefrontActiveCampaigns as getActiveCampaigns } from "@/backend/services/storefrontCampaignService";
import {
  getStorefrontProductBySlug,
  getStorefrontProductSlugs,
} from "@/backend/services/storefrontProductService";
import { buildProductSeo, productShareImages } from "@/backend/utils/productSeo";
import Breadcrumb from "@/components/common/Breadcrumb";
import JsonLd from "@/components/seo/JsonLd";
import { getSiteUrl } from "@/lib/siteUrl";
import { DEFAULT_BLUR_DATA_URL } from "@/utils/cloudinaryUrl";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ProductDataView from "../_components/ProductDataView";
import ProductRecommendations from "../_components/ProductRecommendations";
import { getCategorySizeSettings } from "@/backend/services/sizeChartService";
import ProductImageFirstPreview from "../_components/ProductImageFirstPreview";

export const revalidate = false;
export const dynamic = "force-static";
export const dynamicParams = true;

const compact = (value, length) => {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
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
      alternates: {
        canonical: `${siteUrl}/product/${encodeURIComponent(slug)}`,
      },
      robots: { index: false, follow: false },
    };
  }

  const product = result.data;
  const priceLabel = seo.lowestPrice
    ? `৳${new Intl.NumberFormat("bn-BD", { maximumFractionDigits: 2 }).format(seo.lowestPrice)}`
    : "";
  const title = compact(
    [product.title, priceLabel, product.category?.name]
      .filter(Boolean)
      .join(" - "),
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
  const shareImages = productShareImages(product, seo.url);
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
      images: shareImages.slice(0, 4).map((image, index) => ({
        ...image,
        alt:
          index === 0 ? product.title : `${product.title} - ছবি ${index + 1}`,
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
      ...(product.category?.name && {
        "product:category": product.category.name,
      }),
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
  // Start all work together; only the product itself gates the first photo.
  // React cache shares this product query with metadata and productContext.
  const detailsPromise = Promise.allSettled([
    productContext(slug),
    getActiveCampaigns(),
  ]);
  const result = await getStorefrontProductBySlug(slug);
  if (!result?.success || !result.data) notFound();

  return (
    <Suspense fallback={<ProductImageFirstPreview product={result.data} />}>
      <ProductPageContent detailsPromise={detailsPromise} />
    </Suspense>
  );
}

async function ProductPageContent({ detailsPromise }) {
  const details = await detailsPromise;
  const failure = details.find((item) => item.status === "rejected");
  if (failure) throw failure.reason;
  const [{ result, seo }, activeCampaigns] = details.map((item) => item.value);
  if (!result?.success || !seo) notFound();
  const data = result.data;
  const productCampaigns = activeCampaigns.filter((campaign) => {
    const config = campaign.configuration || {};
    const comboProductIds = (config.productPairs || []).flatMap((pair) => [
      ...(pair.requiredProductIds ||
        (pair.requiredProductId ? [pair.requiredProductId] : [])),
      ...(pair.rewardProductIds?.length
        ? pair.rewardProductIds
        : pair.rewardProductId
          ? [pair.rewardProductId]
          : []),
    ]);
    const hasTargets =
      campaign.products?.length ||
      campaign.categories?.length ||
      comboProductIds.length;
    return (
      (!hasTargets && campaign.type !== "COUPON") ||
      campaign.products?.some((target) => target.productId === data.id) ||
      campaign.categories?.some(
        (target) => target.categoryId === data.categoryId,
      ) ||
      comboProductIds.includes(data.id)
    );
  });
  const campaignOffers = productCampaigns.map(toCampaignDisplayData);
  const variationsWithCampaigns = data.variations.map((variation) => {
    const regular = Number(variation.regularPrice) || 0;
    const sale =
      Number(variation.discountPrice) > 0 &&
      Number(variation.discountPrice) < regular
        ? Number(variation.discountPrice)
        : regular;
    const productItem = {
      productId: data.id,
      categoryId: data.categoryId,
      quantity: 1,
      basePrice: sale,
      price: sale,
    };
    const applicableCampaigns = selectCampaignsByPriority({
      campaigns: productCampaigns,
      items: [productItem],
    });
    const pricing = applyProductCampaign({
      campaigns: applicableCampaigns,
      productId: data.id,
      categoryId: data.categoryId,
      basePrice: sale,
    });
    return {
      ...variation,
      campaignPrice: pricing.campaign ? pricing.price : null,
      campaignName: pricing.campaign?.name || null,
    };
  });
  const hasSize = data.hasVariations && data.variations.some((variant) =>
    variant.combinations.some((option) => option.variationName?.name?.trim().toLowerCase() === "size"),
  );
  const [reviews, sizeSettings] = await Promise.all([
    getPublishedProductPhotoReviews(data.id),
    hasSize ? getCategorySizeSettings(data.categoryId) : null,
  ]);

  return (
    <div className="mb-16 pb-20 sm:pb-0">
      <JsonLd data={seo.structuredData} />
      <Breadcrumb
        items={[
          ...(data.category?.name
            ? [
                {
                  label: data.category.name,
                  href: `/category/${data.category.fullPath || data.category.slug}`,
                },
              ]
            : []),
          { label: data.title },
        ]}
      />
      <ProductDataView
        data={{ ...data, variations: variationsWithCampaigns }}
        campaignOffers={campaignOffers}
        blurDataURL={DEFAULT_BLUR_DATA_URL}
        reviews={reviews}
        sizeChart={sizeSettings?.chart}
      />
      <ProductRecommendations key={data.id} currentProduct={{
        id: data.id,
        slug: data.slug,
        categoryId: data.categoryId,
      }} />
    </div>
  );
}
