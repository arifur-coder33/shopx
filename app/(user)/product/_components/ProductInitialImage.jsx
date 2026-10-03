// Server component: keep the first product image in the initial HTML.
// The interactive gallery hydrates over this image after JavaScript is ready.
import { preload } from "react-dom";
import { productImageSources } from "@/utils/productImage";

export default function ProductInitialImage({ imageId, alt }) {
  if (!imageId) return null;
  const sources = productImageSources(imageId);
  preload(sources.src, {
    as: "image",
    imageSrcSet: sources.srcSet,
    imageSizes: sources.sizes,
    fetchPriority: "high",
  });

  return (
    // Native responsive HTML: the browser chooses a size before JS loads.
    <img
      {...sources}
      alt={alt || "Product image"}
      width={1200}
      height={1200}
      loading="eager"
      fetchPriority="high"
      className="absolute inset-0 h-full w-full rounded-md object-contain"
    />
  );
}
