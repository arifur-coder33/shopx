import LazyLoadOnScroll from "@/components/common/LazyLoadOnScroll";
import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
import dynamic from "next/dynamic"; // <-- Import dynamic
import Image from "next/image";
import ViewProductEvent from "../[slug]/_components/ViewProductEvent";
import DeliveryInfo from "./DeliveryInfo";
import ProductHeader from "./ProductHeader";
const ProductImageGallery = dynamic(
  () => import("./ProductImageGallery"), // <-- Corrected
);
// --- LAZY-LOADED COMPONENTS ---
const ProductDescription = dynamic(
  () => import("@/components/products/productDescription"),
);
const FacebookEventTrac = dynamic(() => import("./FacebookEventTrack"));

export default function ProductDataView({
  data,
  blurDataURL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
}) {
  const mainProductImageId = data?.thumbnail?.name || data?.mainImage;

  const { title, description } = data;
  const imageProps = {
    initialSrc: mainProductImageId,
    blurDataURL,
    alt: title,
  };
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        <ProductHeader data={data} imageProps={imageProps}>
          <Image
            src={cloudinaryMainImage(mainProductImageId, 600, 600)}
            alt={title}
            fill
            // priority={true}
            sizes="(max-width: 768px) 100vw, 40vw"
            className="rounded-md object-contain"
            placeholder="blur"
            blurDataURL={blurDataURL}
            priority
            fetchPriority="high"
          />
        </ProductHeader>
      </div>
      <DeliveryInfo />
      <LazyLoadOnScroll>
        <ProductDescription description={description} />
        <ViewProductEvent product={data} />
      </LazyLoadOnScroll>

      {/* --- LAZY LOAD THE FACEBOOK TRACKER --- */}
      {/* This doesn't need to fire until the user scrolls a bit */}
    </>
  );
}
