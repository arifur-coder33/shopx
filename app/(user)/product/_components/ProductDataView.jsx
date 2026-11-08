import ProductDescription from "@/components/products/productDescription";
import ProductSpecifications from "@/components/products/ProductSpecifications";
import { replaceNumbers } from "@/utils/engToBanNumber";
import { Truck } from "lucide-react";
import ViewProductEvent from "../[slug]/_components/ViewProductEvent";
import ProductDetailMedia from "./ProductDetailMedia";
import ProductHeader from "./ProductHeader";
import ProductInfoTabs from "./ProductInfoTabs";

export default function ProductDataView({
  data,
  campaignOffers = [],
  blurDataURL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  adminView,
  reviews = [],
  sizeChart,
}) {
  const mainProductImageId = data?.thumbnail?.name || data?.mainImage;

  const { title, description } = data;
  const hasSpecifications = (data.specifications || []).some(
    (row) => row?.value?.trim() && row?.specification,
  );
  const detailPhotos = [
    data.thumbnail,
    ...(data.gallery || []),
    ...(data.variations || []).map((variation) => variation.thumbnail),
  ];
  const hasPhotos = detailPhotos.some((photo) => photo?.name);
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
      <section className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-border bg-surface p-3 text-sm text-text-secondary">
        <span className="inline-flex items-center gap-1.5 font-semibold text-text-primary">
          <Truck className="h-4 w-4 text-primary" />
          ডেলিভারি সময়: {replaceNumbers(String(data.deliveryMinDays ?? 2))}–
          {replaceNumbers(String(data.deliveryMaxDays ?? 5))} দিন
        </span>
        <span>
          {data.codAvailable === false
            ? "এই পণ্যে COD নেই"
            : data.advancePaymentType && data.advancePaymentType !== "NONE"
              ? "অগ্রিমের পর বাকি COD-তে দেওয়া যাবে"
              : "Cash on Delivery পাওয়া যাবে"}
        </span>
        {data.advancePaymentType === "DELIVERY_FEE" && (
          <span>ডেলিভারি চার্জ অগ্রিম দিতে হবে</span>
        )}
        {data.advancePaymentType === "PARTIAL" && (
          <span>
            অগ্রিম:{" "}
            {data.advancePaymentValueType === "PERCENT"
              ? `${data.advancePaymentValue}%`
              : `৳${data.advancePaymentValue}`}
          </span>
        )}
      </section>

      <div
        style={{
          contentVisibility: "auto",
          containIntrinsicSize: "480px",
        }}
      >
        <ProductInfoTabs
          sizeChart={sizeChart}
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
