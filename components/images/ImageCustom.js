// "use client";
// import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
// import Image from "next/image";
// import { useState } from "react";

// export default function Imagecustom({
//   src,
//   style,
//   w,
//   h,
//   alt,
//   priority,
//   sizes,
//   quality,

// }) {
//   const [isLoaded, setIsLoaded] = useState(false);
//   return (
//     <Image
//       src={cloudinaryMainImage(src, w, h)}
//       sizes={sizes}
//       // loader={customLoader}
//       className={`rounded-md  ${style} ${
//         isLoaded ? "remove-blur" : "blur"
//       }`}

//       width={w}
//       height={h}
//       alt={alt ? alt : "image"}
//       onLoad={() => setIsLoaded(true)}
//       priority={priority}
//       quality={quality}

//     />
//   );
// }
// "use client";
// import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
// import Image from "next/image";
// import { useState, useEffect, useRef } from "react";

// export default function Imagecustom({
//   src,
//   style, // This style will be applied to the wrapper for placeholder
//   w,
//   h,
//   alt,
//   priority, // If true, we'll bypass IntersectionObserver
//   sizes,
//   quality,
// }) {
//   const [isLoaded, setIsLoaded] = useState(false);
//   const [isInView, setIsInView] = useState(false);
//   const placeholderRef = useRef(null);

//   useEffect(() => {
//     // If priority is true, image should load immediately, so set isInView true
//     if (priority) {
//       setIsInView(true);
//       return;
//     }

//     // If no ref, or already in view (e.g. from priority), do nothing
//     if (!placeholderRef.current || isInView) return;

//     const observer = new IntersectionObserver(
//       ([entry]) => {
//         // Update state when element comes into view
//         if (entry.isIntersecting) {
//           setIsInView(true);
//           observer.unobserve(entry.target); // No need to observe anymore
//         }
//       },
//       {
//         // Optional: Adjust rootMargin to trigger loading slightly before
//         // the element is fully in view. E.g., "0px 0px 200px 0px"
//         // means it will trigger when the element is 200px from the bottom edge
//         // of the viewport.
//         rootMargin: "0px 0px 100px 0px", // Load 100px before it's visible
//       }
//     );

//     observer.observe(placeholderRef.current);

//     return () => {
//       // Disconnect observer on unmount
//       if (placeholderRef.current) {
//         // eslint-disable-next-line react-hooks/exhaustive-deps
//         observer.unobserve(placeholderRef.current);
//       }
//     };
//   }, [priority, isInView]); // Re-run if priority changes or if isInView was somehow set externally

//   // If priority is true, render the image directly
//   if (priority) {
//     return (
//       <Image
//         src={cloudinaryMainImage(src, w, h)}
//         sizes={sizes}
//         className={`rounded-md ${style || ""} ${ // Added style here
//           isLoaded ? "remove-blur" : "blur"
//         }`}
//         width={w}
//         height={h}
//         alt={alt ? alt : "image"}
//         onLoad={() => setIsLoaded(true)}
//         priority={true} // Explicitly true
//         quality={quality}
//       />
//     );
//   }

//   // For non-priority, use Intersection Observer
//   return (
//     <div
//       ref={placeholderRef}
//       style={{  height: h, width:w, objectFi:'' }} // Ensure placeholder takes up space
//       className={`rounded-md ${style || ""} ${ // Apply style to wrapper
//         isInView && isLoaded ? "remove-blur" : "blur" // Keep blur until loaded AND in view
//       }`}
//     >
//       {isInView ? (
//         <Image
//          ref={placeholderRef}
//           src={cloudinaryMainImage(src, w, h)}
//           sizes={sizes}
//           // No specific className for blur here, handled by parent div or can be added if needed
//           className={`rounded-md ${isInView && isLoaded ? "remove-blur" : "blur" ? "remove-blur" : "blur"}`} // This would make Image itself blur/unblur

//           width={w}
//           height={h}
//           alt={alt ? alt : "image"}
//           onLoad={() => setIsLoaded(true)}
//           priority={false} // Explicitly false
//           quality={quality}
//           loading="lazy" // Still good to keep for browsers that support it well
//         />
//       ) : (
//         // Optional: A visible placeholder content while not in view
//         // The div itself acts as a placeholder maintaining dimensions.
//         // You could add a spinner or a specific background color.
//         // For now, the blur class on the div handles the visual.
//         null
//       )}
//     </div>
//   );
// }

"use client";
import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

// export default function Imagecustom({
//   src,
//   // Use 'className' for classes intended for the Image/wrapper
//   // And 'imageClassName' specifically for the Next/Image element
//   className: wrapperClassName, // Classes for the wrapper div (non-priority) or Image (priority)
//   imageClassName, // Specific classes for the Next/Image component
//   w,
//   h,
//   alt,
//   priority,
//   sizes,
//   quality,
//   objectFit = "cover", // Default to 'cover', allow override
//   fill, // Add fill prop
// }) {
//   const [isLoaded, setIsLoaded] = useState(false);
//   // Initialize isInView to true if priority is true
//   const [isInView, setIsInView] = useState(!!priority);
//   const placeholderRef = useRef(null);

//   useEffect(() => {
//     if (priority || isInView) {
//       // If priority, or already in view, it's effectively "in view"
//       if (!isInView) setIsInView(true); // Ensure isInView is true if priority was initially false but became true
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
//       {
//         rootMargin: "0px 0px 100px 0px",
//       }
//     );

//     const currentRef = placeholderRef.current;
//     observer.observe(currentRef);

//     return () => {
//       if (currentRef) {
//         observer.unobserve(currentRef);
//       }
//     };
//   }, [priority, isInView]); // Re-run if priority changes

//   const commonImageProps = {
//     src: cloudinaryMainImage(src, fill ? undefined : w, fill ? undefined : h), // w,h ignored if fill is true
//     alt: alt || "image",
//     quality: quality,
//     onLoad: () => setIsLoaded(true),
//     priority: !!priority, // Ensure boolean
//     sizes: sizes,
//   };

//   // Determine how to apply dimensions and objectFit
//   let imageStyle = {};
//   let imageDimensionProps = {};

//   if (fill) {
//     imageDimensionProps.fill = true;
//     imageStyle.objectFit = objectFit;
//   } else {
//     imageDimensionProps.width = w;
//     imageDimensionProps.height = h;
//     imageStyle.objectFit = objectFit; // objectFit is still relevant even without fill
//   }

//   const finalImageClassName = `rounded-md ${imageClassName || ""} ${
//     isLoaded ? "remove-blur" : "blur"
//   }`;

//   // If priority is true OR if it's now in view (for non-priority images)
//   if (priority || isInView) {
//     return (
//       <Image
//         {...commonImageProps}
//         {...imageDimensionProps}
//         style={imageStyle}
//         className={finalImageClassName}
//         loading={priority ? "eager" : "lazy"} // Eager for priority, lazy otherwise
//         alt=""
//       />
//     );
//   }

//   // For non-priority images not yet in view, render the placeholder
//   // The placeholder itself will be blurred by its own class
//   return (
//     <div
//       ref={placeholderRef}
//       style={{ width: w, height: h }} // Ensure placeholder takes up space
//       className={`image-placeholder rounded-md ${wrapperClassName || ""} blur`} // Wrapper gets blur initially
//     >
//       {/* The div acts as a sized, blurred placeholder.
//           You could put a low-quality placeholder image here if desired,
//           but for blur effect, an empty div with background or just dimensions is often enough. */}
//     </div>
//   );
// }

// Imagecustom.js

// ... (imports and other code) ...

// A simple, small, transparent base64 encoded GIF for blurDataURL
const shimmer = (w, h) => `
<svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="g">
      <stop stop-color="#f0f0f0" offset="20%" />
      <stop stop-color="#e0e0e0" offset="50%" />
      <stop stop-color="#f0f0f0" offset="70%" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#f0f0f0" />
  <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
  <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1s" repeatCount="indefinite"  />
</svg>`;

const toBase64 = (str) =>
  typeof window === "undefined"
    ? Buffer.from(str).toString("base64")
    : window.btoa(str);

export default function Imagecustom({
  src,
  className: wrapperClassName = "", // For the main div wrapper
  imageClassName = "", // For the Next/Image component itself
  w,
  h,
  alt = "image",
  priority = false,
  sizes,
  quality,
  objectFit = "cover",
  fill,
  showSpinner = true, // New prop to control spinner visibility
}) {
  const [imageStatus, setImageStatus] = useState(
    priority ? "loading" : "pending"
  ); // 'pending', 'loading', 'loaded', 'error'
  const [isInView, setIsInView] = useState(!!priority);
  const placeholderRef = useRef(null);

  useEffect(() => {
    if (priority) {
      // If priority, bypass IntersectionObserver and set to loading
      setIsInView(true);
      if (imageStatus === "pending") setImageStatus("loading");
      return;
    }

    if (!placeholderRef.current || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          setImageStatus("loading"); // Start loading when it comes into view
          observer.unobserve(entry.target);
        }
      },
      {
        rootMargin: "0px 0px 200px 0px", // Load images 200px before they enter viewport
      }
    );

    const currentRef = placeholderRef.current;
    observer.observe(currentRef);

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [priority, isInView, imageStatus]); // imageStatus added to re-evaluate if needed

  const commonImageProps = {
    alt,
    quality,
    priority, // next/image priority
    sizes,
    onError: () => setImageStatus("error"),
    onLoad: () => {
      // Add a slight delay to ensure blur effect is visible if loading is too fast
      setTimeout(() => setImageStatus("loaded"), 50);
    },
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

  // Determine CSS classes for Next/Image
  let dynamicImageClassName = `image-next ${imageClassName} `;
  if (imageStatus === "loading") {
    dynamicImageClassName += "blur-on-load";
  } else if (imageStatus === "loaded") {
    dynamicImageClassName += "loaded";
  }

  const placeholderContent = showSpinner ? (
    <div className="image-loading-spinner"></div>
  ) : null;

  // If not priority and not yet in view, or src is missing
  if (!src || (!priority && !isInView && imageStatus === "pending")) {
    const placeholderStyle = fill
      ? { width: "100%", height: "100%" }
      : { width: w, height: h };
    return (
      <div
        ref={placeholderRef}
        style={placeholderStyle}
        className={`image-custom-placeholder  image-loading-spinner ${wrapperClassName} rounded-md`}
        aria-label={alt || "Image placeholder"}
      >
        {/* Optionally, show a spinner even in the initial placeholder */}
        {/* {showSpinner && <div className="image-loading-spinner"></div>} */}
      </div>
    );
  }

  // If image encountered an error
  if (imageStatus === "error") {
    const errorPlaceholderStyle = fill
      ? { width: "100%", height: "100%" }
      : { width: w, height: h };
    return (
      <div
        style={errorPlaceholderStyle}
        className={`image-custom-placeholder ${wrapperClassName} rounded-md`}
        role="img"
        aria-label={`Error loading ${alt}`}
      >
        ⚠️
      </div>
    );
  }

  // Render the image (it will be either loading state with blur, or loaded state)
  // The wrapper div ensures consistent sizing and allows rounded corners from `imageClassName` to apply if `overflow:hidden`
  const wrapperStyles = fill
    ? { position: "relative", width: "100%", height: "100%" }
    : { width: w, height: h };

  return (
    <div
      ref={placeholderRef} // Still needed for initial mount if not priority
      className={`image-custom-wrapper ${wrapperClassName} rounded-md`}
      style={wrapperStyles}
    >
      {imageStatus === "loading" && showSpinner && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1, // Above the blurring image
          }}
        >
          <div className="image-loading-spinner"></div>
        </div>
      )}
      <Image
        {...commonImageProps}
        src={cloudinaryMainImage(
          src,
          fill ? undefined : w,
          fill ? undefined : h
        )}
        {...imageDimensionProps}
        style={imageStyle}
        className={dynamicImageClassName} // Ensure this includes rounded-md if needed
        placeholder="blur" // Use Next.js built-in blur
        blurDataURL={`data:image/svg+xml;base64,${toBase64(
          shimmer(fill ? 700 : w, fill ? 475 : h)
        )}`} // Generic shimmer
        loading={priority ? "eager" : "lazy"} // next/image loading strategy
      />
    </div>
  );
}
