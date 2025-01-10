import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
import Image from "next/image";
export function ProductImageGallery({ imageGallery, title }) {
  if (imageGallery?.length === 0) return;
  return (
    <div className="flex gap-2 flex-col">
      Image gallery
      {imageGallery?.length > 0 &&
        imageGallery.map((image) => {
          return (
            <Image
              key={image}
              src={cloudinaryMainImage(image, 800, 800)}
              alt={title}
              width={800}
              height={800}
              placeholder="blur"
              blurDataURL={image}
              sizes="(max-width: 768px) 100vh, (max-width: 1200px) 800px, 800px"
              loading="lazy"
            />
          );
        })}
    </div>
  );
}
