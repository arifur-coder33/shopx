import LazyLoadOnScroll from "@/components/common/LazyLoadOnScroll";

import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
import Image from "next/image";

const ProductImageGallery = dynamic(
  () => import("./ProductImageGallery"), // <-- Corrected
);

import dynamic from "next/dynamic"; // <-- Import dynamic
import ViewProductEvent from "../[slug]/_components/ViewProductEvent";
import DeliveryInfo from "./DeliveryInfo";
import ProductHeader from "./ProductHeader";
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
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        <ProductHeader data={data}>
          <Image
            src={cloudinaryMainImage(mainProductImageId, 600, 600)}
            alt={title}
            fill={true} // Use fill for responsive sizing within the container
            priority={true}
            sizes="(max-width: 768px) 100vw, 40vw"
            className="rounded-md object-contain"
            placeholder="blur"
            blurDataURL={blurDataURL}
          />
        </ProductHeader>
      </div>
      <DeliveryInfo />
      <LazyLoadOnScroll>
        <ProductDescription description={description} />
      </LazyLoadOnScroll>

      {/* --- LAZY LOAD THE FACEBOOK TRACKER --- */}
      {/* This doesn't need to fire until the user scrolls a bit */}

      <ViewProductEvent product={data} />
    </>
  );
}
