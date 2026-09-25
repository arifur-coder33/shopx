import ViewProductEvent from "../[slug]/_components/ViewProductEvent";
import DeliveryInfo from "./DeliveryInfo";
import ProductDetailMedia from "./ProductDetailMedia";
import ProductHeader from "./ProductHeader";
import ProductDescription from "@/components/products/productDescription";
import ProductSpecifications from "@/components/products/ProductSpecifications";
import ProductInfoTabs from "./ProductInfoTabs";

export default function ProductDataView({
  data,
  campaignOffers = [],
  blurDataURL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  adminView,
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
        <ProductHeader data={data} imageProps={imageProps} campaignOffers={campaignOffers} />
      </section>
      <DeliveryInfo />
      <div
        style={{
          contentVisibility: "auto",
          containIntrinsicSize: "480px",
        }}
      >
        <ProductInfoTabs
          hasSpecifications={hasSpecifications}
          description={<ProductDescription description={description} />}
          specifications={<ProductSpecifications specifications={data.specifications} />}
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
        />
        {!adminView && <ViewProductEvent product={trackingProduct} />}
      </div>

      {/* --- LAZY LOAD THE FACEBOOK TRACKER --- */}
      {/* This doesn't need to fire until the user scrolls a bit */}
    </>
  );
}
