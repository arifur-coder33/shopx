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
import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
import { getBase64ImageUrl } from "@/utils/getBase64";
import Image from "next/image";

// This is now an ASYNC SERVER COMPONENT. No client-side JS!
export default async function Imagecustom({
  src, // Image ID
  w,
  h,
  alt,
  priority,
  className,
  sizes,
  quality = 75,
}) {
  // Generate the full-size image URL and the blur placeholder URL in parallel
  const [finalSrc, blurDataURL] = await Promise.all([
    cloudinaryMainImage(src, w, h),
    getBase64ImageUrl(src), // Generate the blur placeholder
  ]);

  return (
    <Image
      src={finalSrc}
      width={w}
      height={h}
      alt={alt || "product image"}
      className={className}
      sizes={sizes}
      quality={quality}
      // Let next/image handle everything automatically!
      priority={priority} // If true, sets loading="eager". If false, sets loading="lazy".
      placeholder="blur" // Use the blur-up effect.
      blurDataURL={blurDataURL} // Provide the data for the blur.
    />
  );
}
