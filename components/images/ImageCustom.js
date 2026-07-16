"use client";
import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

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
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(!!priority);
  const placeholderRef = useRef(null);

  useEffect(() => {
    if (priority || isInView) {
      if (!isInView) setIsInView(true);
      return;
    }
    if (!placeholderRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px 100px 0px" },
    );
    const currentRef = placeholderRef.current;
    observer.observe(currentRef);
    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, [priority, isInView]);

  // If using `fill`, use `urlWidthHint` for the URL.
  // If not using `fill`, use the standard `w` prop.
  const widthForUrl = fill ? urlWidthHint : w;
  const heightForUrl = fill ? urlWidthHint : h;

  const finalSrc = cloudinaryMainImage(src, widthForUrl, heightForUrl);

  const commonImageProps = {
    src: finalSrc,
    alt: alt || "image",
    quality,
    onLoad: () => setIsLoaded(true),
    priority: !!priority,
    sizes,
  };

  let imageStyle = {};
  let imageDimensionProps = {};

  if (fill) {
    imageDimensionProps.fill = true;
    imageStyle.objectFit = objectFit;
  } else {
    imageDimensionProps.width = w;
    imageDimensionProps.height = h;
    imageStyle.objectFit = objectFit;
  }

  const finalImageClassName = `rounded-md ${imageClassName || ""} ${
    isLoaded ? "remove-blur" : "blur"
  }`;

  if (priority || isInView) {
    return (
      <Image
        {...commonImageProps}
        {...imageDimensionProps}
        style={imageStyle}
        className={finalImageClassName}
        loading={priority ? "eager" : "lazy"}
        alt=""
        unoptimized={true}
      />
    );
  }

  return (
    <div
      ref={placeholderRef}
      style={{ width: "100%", height: "100%" }}
      className={`image-placeholder rounded-md ${wrapperClassName || ""} blur`}
    ></div>
  );
}
