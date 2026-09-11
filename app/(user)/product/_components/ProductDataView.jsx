import ViewProductEvent from "../[slug]/_components/ViewProductEvent";
import DeliveryInfo from "./DeliveryInfo";
import ProductDetailMedia from "./ProductDetailMedia";
import ProductHeader from "./ProductHeader";
import ProductDescription from "@/components/products/productDescription";

export default function ProductDataView({
  data,
  blurDataURL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  adminView,
}) {
  const mainProductImageId = data?.thumbnail?.name || data?.mainImage;

  const { title, description } = data;
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
        <ProductHeader data={data} imageProps={imageProps} />
      </section>
      <DeliveryInfo />
      <div
        style={{
          contentVisibility: "auto",
          containIntrinsicSize: "480px",
        }}
      >
        <ProductDescription description={description} />
        <ProductDetailMedia
          title={title}
          videoUrl={data.videoUrl}
          videos={data.videos}
          gallery={[
            data.thumbnail,
            ...(data.gallery || []),
            ...(data.variations || []).map((variation) => variation.thumbnail),
          ]}
        />
        {!adminView && <ViewProductEvent product={trackingProduct} />}
      </div>

      {/* --- LAZY LOAD THE FACEBOOK TRACKER --- */}
      {/* This doesn't need to fire until the user scrolls a bit */}
    </>
  );
}
