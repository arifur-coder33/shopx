// "use client";
// import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
// import Image from "next/image";
// import { useEffect, useRef, useState } from "react";

// export default function Imagecustom({
//   src, // Image ID
//   w, // For non-fill images
//   h, // For non-fill images
//   urlWidthHint, // NEW: For generating URL when using fill
//   alt,
//   priority,
//   fill,
//   objectFit = "cover",
//   style,
//   imageClassName,
//   className: wrapperClassName,
//   sizes,
//   quality,
// }) {
//   const [isLoaded, setIsLoaded] = useState(false);
//   const [isInView, setIsInView] = useState(!!priority);
//   const placeholderRef = useRef(null);

//   useEffect(() => {
//     if (priority || isInView) {
//       if (!isInView) setIsInView(true);
//       return;
//     }
//     if (!placeholderRef.current) return;
//     const observer = new IntersectionObserver(
//       ([entry]) => {
//         if (entry.isIntersecting) {
//           setIsInView(true);
//           observer.unobserve(entry.target);
//         }
//       },
//       { rootMargin: "0px 0px 100px 0px" }
//     );
//     const currentRef = placeholderRef.current;
//     observer.observe(currentRef);
//     return () => {
//       if (currentRef) observer.unobserve(currentRef);
//     };
//   }, [priority, isInView]);

//   // If using `fill`, use `urlWidthHint` for the URL.
//   // If not using `fill`, use the standard `w` prop.
//   const widthForUrl = fill ? urlWidthHint : w;
//   const heightForUrl = fill ? urlWidthHint : h;

//   const finalSrc = cloudinaryMainImage(src, widthForUrl, heightForUrl);

//   const commonImageProps = {
//     src: finalSrc,
//     alt: alt || "image",
//     quality,
//     onLoad: () => setIsLoaded(true),
//     priority: !!priority,
//     sizes,
//   };

//   let imageStyle = {};
//   let imageDimensionProps = {};

//   if (fill) {
//     imageDimensionProps.fill = true;
//     imageStyle.objectFit = objectFit;
//   } else {
//     imageDimensionProps.width = w;
//     imageDimensionProps.height = h;
//     imageStyle.objectFit = objectFit;
//   }

//   const finalImageClassName = `rounded-md ${imageClassName || ""} ${
//     isLoaded ? "remove-blur" : "blur"
//   }`;

//   if (priority || isInView) {
//     return (
//       <Image
//         {...commonImageProps}
//         {...imageDimensionProps}
//         style={imageStyle}
//         className={finalImageClassName}
//         loading={priority ? "eager" : "lazy"}
//         alt=""
//       />
//     );
//   }

//   return (
//     <div
//       ref={placeholderRef}
//       style={{ width: "100%", height: "100%" }}
//       className={`image-placeholder rounded-md ${wrapperClassName || ""} blur`}
//     ></div>
//   );
// }

// REMOVE: "use client";
// REMOVE: "use client";
import { cloudinaryMainImage, getBase64ImageUrl } from "@/utils/cloudinaryUrl";

import Image from "next/image";

// This is an ASYNC SERVER COMPONENT.
export default async function Imagecustom({
  src, // Image ID (required)
  alt,
  priority,
  className,
  sizes,
  quality = 75,

  // --- PROPS FOR FIXED SIZE MODE ---
  w,
  h,

  // --- PROPS FOR RESPONSIVE FILL MODE ---
  fill, // boolean
  objectFit, // string, e.g., 'cover' or 'contain'
  urlWidthHint, // number, e.g., 1280 (A hint for URL generation when `fill` is true)
}) {
  // If using `fill`, use `urlWidthHint`. Otherwise, use `w`.
  const widthForUrl = fill ? urlWidthHint : w;

  // Generate the full-size image URL and the blur placeholder URL in parallel.
  const [finalSrc, blurDataURL] = await Promise.all([
    cloudinaryMainImage(src, widthForUrl),
    getBase64ImageUrl(src),
  ]);

  // Create a base object for props common to both modes
  const commonImageProps = {
    src: finalSrc,
    alt: alt || "image",
    className: className,
    sizes: sizes,
    quality: quality,
    priority: priority,
    placeholder: "blur",
    blurDataURL: blurDataURL,
  };

  // --- THE CORE LOGIC ---
  // If `fill` is true, return the <Image> component configured for fill mode.
  if (fill) {
    return (
      <Image
        {...commonImageProps}
        fill
        style={{ objectFit: objectFit || "cover" }}
      />
    );
  }

  // Otherwise, return the <Image> component configured for fixed width/height mode.
  return <Image {...commonImageProps} width={w} height={h} />;
}
