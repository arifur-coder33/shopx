import ProductDescription from "@/components/products/productDescription";
import ProductSpecifications from "@/components/products/ProductSpecifications";
import { replaceNumbers } from "@/utils/engToBanNumber";
import {
  Banknote,
  PackageCheck,
  Repeat2,
  RotateCcw,
  Truck,
} from "lucide-react";
import ViewProductEvent from "../[slug]/_components/ViewProductEvent";
import ProductDetailMedia from "./ProductDetailMedia";
import ProductHeader from "./ProductHeader";
import ProductInfoTabs from "./ProductInfoTabs";

export default function ProductDataView({
  data,
  campaignOffers = [],
  deliveryCampaignLabel,
  deliveryBenefits,
  blurDataURL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  adminView,
  reviews = [],
  sizeChart,
}) {
  const mainProductImageId = data?.thumbnail?.name || data?.mainImage;

  const { title, description } = data;
  const hasAdvance =
    data.advancePaymentType && data.advancePaymentType !== "NONE";
  const deliveryMaxDays = Number(data.deliveryMaxDays ?? 5);
  const benefits = [
    {
      id: "delivery-time",
      icon: Truck,
      label: `${deliveryMaxDays < 7 ? "দ্রুত ডেলিভারি" : "ডেলিভারির সময়"}: ${replaceNumbers(String(data.deliveryMinDays ?? 2))}–${replaceNumbers(String(deliveryMaxDays))} দিন`,
    },
    {
      id: "delivery",
      icon: PackageCheck,
      label: deliveryCampaignLabel,
      detail: "ক্যাম্পেইন অনুযায়ী",
    },
    {
      id: "cod",
      icon: Banknote,
      label: data.codAvailable === false ? null : "Cash on Delivery",
      detail: hasAdvance
        ? "অগ্রিমের পর বাকি টাকা"
        : "পণ্য হাতে পেয়ে মূল্য পরিশোধ",
    },
    {
      id: "exchange",
      icon: Repeat2,
      label: deliveryBenefits?.exchangeText,
      detail: "সহজ এক্সচেঞ্জ সুবিধা",
    },
    {
      id: "return",
      icon: RotateCcw,
      label: deliveryBenefits?.returnText,
      detail: "শর্তসাপেক্ষে",
    },
  ].filter(({ label }) => label);
  const hasSpecifications = (data.specifications || []).some(
    (row) => row?.value?.trim() && row?.specification,
  );
  const detailPhotos = [
    data.thumbnail,
    ...(data.gallery || []),
    ...(data.variations || []).map((variation) => variation.thumbnail),
    ...(data.bundleOptions || []).map((item) => item.sizeChart?.image && ({
      id: item.sizeChart.image.id || item.sizeChart.image.name,
      name: item.sizeChart.image.name,
      seoAlt: `${item.title} size guide`,
    })),
  ].filter(Boolean);
  const hasPhotos = detailPhotos.some((photo) => photo?.name);
  const sizeGuides = [...new Map([
    sizeChart,
    ...(data.bundleOptions || []).map((item) => item.sizeChart),
  ].filter(Boolean).map((chart) => [chart.id || chart.image?.id || chart.image?.name || chart.name, chart])).values()];
  const hasVideos = Boolean(
    (data.videos || []).some((video) => video?.url) || data.videoUrl,
  );
  const imageProps = {
    initialSrc: mainProductImageId,
    blurDataURL,
    alt: title,
  };
  const trackingProduct = {
    id: data.id,
    slug: data.slug,
    title: data.title,
    image:
      data.thumbnail?.name || data.variations?.[0]?.thumbnail?.name || null,
    hasVariations: Boolean(data.hasVariations),
    regularPrice: data.variations?.[0]?.regularPrice ?? null,
    discountPrice: data.variations?.[0]?.discountPrice ?? null,
    category: data.category?.name
      ? { name: data.category.name }
      : data.category || "Uncategorized",
    variations: (data.variations || []).slice(0, 1).map((variation) => ({
      sku: variation.sku,
      regularPrice: variation.regularPrice,
      discountPrice: variation.discountPrice,
    })),
  };
  return (
    <>
      <section className="grid grid-cols-1 gap-4 overflow-hidden rounded-2xl border border-border bg-surface p-2 shadow-sm sm:p-4 md:grid-cols-2 md:gap-6">
        <ProductHeader
          data={data}
          imageProps={imageProps}
          campaignOffers={campaignOffers}
          sizeChart={sizeChart}
        />
      </section>
      <section className="mt-3">
        {benefits.length > 0 && (
          <ul className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {benefits.map(({ id, icon: Icon, label, detail }) => (
              <li
                key={id}
                className="relative flex h-12 min-w-0 items-center gap-2 overflow-hidden rounded-xl border border-border bg-surface px-2 text-left shadow-sm transition-shadow hover:shadow-brand sm:h-auto sm:min-h-20 sm:flex-col sm:gap-0 sm:rounded-2xl sm:px-3 sm:pb-2 sm:pt-2 sm:text-center"
              >
                <span className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-white shadow-md shadow-primary/25 sm:mt-0.5 sm:h-10 sm:w-10 sm:rounded-xl">
                  <Icon
                    className="h-4 w-4 sm:h-5 sm:w-5"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                </span>
                <span className="relative z-10 line-clamp-2 min-w-0 text-xs font-bold leading-tight text-text-primary sm:mt-2 sm:text-base sm:leading-snug">
                  {label}
                  {detail && (
                    <small className="mt-1 hidden text-xs font-normal leading-relaxed text-text-muted sm:block">
                      {detail}
                    </small>
                  )}
                </span>
                <span
                  className="pointer-events-none absolute -bottom-7 -right-5 z-0 h-16 w-24 rotate-[-12deg] rounded-[50%] bg-primary-soft/70"
                  aria-hidden="true"
                />
              </li>
            ))}
          </ul>
        )}
        {(data.advancePaymentType === "DELIVERY_FEE" ||
          data.advancePaymentType === "PARTIAL") && (
          <p className="mt-2 text-xs text-text-secondary">
            {data.advancePaymentType === "DELIVERY_FEE" ? (
              "ডেলিভারি চার্জ অগ্রিম দিতে হবে"
            ) : (
              <>
                অগ্রিম:{" "}
                {data.advancePaymentValueType === "PERCENT"
                  ? `${data.advancePaymentValue}%`
                  : `৳${data.advancePaymentValue}`}
              </>
            )}
          </p>
        )}
      </section>

      <div
        style={{
          contentVisibility: "auto",
          containIntrinsicSize: "480px",
        }}
      >
        <ProductInfoTabs
          sizeCharts={sizeGuides}
          hasSpecifications={hasSpecifications}
          description={<ProductDescription description={description} />}
          specifications={
            <ProductSpecifications specifications={data.specifications} />
          }
          videos={
            hasVideos ? (
              <ProductDetailMedia
                only="videos"
                sectionId="product-videos"
                title={title}
                videoUrl={data.videoUrl}
                videos={data.videos}
                gallery={detailPhotos}
              />
            ) : null
          }
          photos={
            hasPhotos ? (
              <ProductDetailMedia
                only="photos"
                sectionId="product-more-photos"
                title={title}
                gallery={detailPhotos}
              />
            ) : null
          }
          reviews={reviews}
          reviewSubtitle={`Customer experiences with ${title}`}
          questionsAnswers={data.questionsAnswers || []}
        />
        {!adminView && <ViewProductEvent product={trackingProduct} />}
      </div>

      {/* --- LAZY LOAD THE FACEBOOK TRACKER --- */}
      {/* This doesn't need to fire until the user scrolls a bit */}
    </>
  );
}
