// Server component: keep the first product image in the initial HTML.
// The interactive gallery hydrates over this image after JavaScript is ready.
import Image from "next/image";
import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";

export default function ProductInitialImage({ imageId, alt }) {
  if (!imageId) return null;

  return (
    <Image
      // Match the hydrated gallery URL so the client reuses this request.
      src={cloudinaryMainImage(imageId, 600, 600)}
      alt={alt || "Product image"}
      fill
      priority
      fetchPriority="high"
      sizes="(max-width: 768px) 100vw, 40vw"
      className="rounded-md object-contain"
      unoptimized
    />
  );
}
