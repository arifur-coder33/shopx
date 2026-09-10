import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
import Image from "next/image";

export default function Imagecustom({
  src, // Image ID
  w, // For non-fill images   category: product.category.name,conso
  h, // For non-fill images
  urlWidthHint, // NEW: For generating URL when using fill
  alt,
  priority,
  fill,
  objectFit = "cover",
  style,
  imageClassName,
  className: wrapperClassName,
  sizes,
  quality,
}) {
  // If using `fill`, use `urlWidthHint` for the URL.
  // If not using `fill`, use the standard `w` prop.
  const widthForUrl = fill ? urlWidthHint : w;
  const heightForUrl = fill ? urlWidthHint : h;

  const finalSrc = cloudinaryMainImage(src, widthForUrl, heightForUrl);

  const commonImageProps = {
    src: finalSrc,
    alt: alt || "image",
    quality,
    priority: !!priority,
    sizes,
  };

  let imageStyle = typeof style === "object" && style ? { ...style } : {};
  let imageDimensionProps = {};

  if (fill) {
    imageDimensionProps.fill = true;
    imageStyle.objectFit = objectFit;
  } else {
    imageDimensionProps.width = w;
    imageDimensionProps.height = h;
    imageStyle.objectFit = objectFit;
  }

  const finalImageClassName = `rounded-md ${wrapperClassName || ""} ${
    typeof style === "string" ? style : ""
  } ${imageClassName || ""}`;

  return (
    <Image
      {...commonImageProps}
      {...imageDimensionProps}
      style={imageStyle}
      className={finalImageClassName}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      unoptimized
    />
  );
}
