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

export default function Imagecustom({
  src,
  className: wrapperClassName,
  imageClassName,
  w, // Still useful for Next/Image props and Cloudinary URL if not using fill
  h, // Still useful for Next/Image props and Cloudinary URL if not using fill
  alt,
  priority,
  sizes,
  quality,
  objectFit = "cover",
  fill,
}) {
  // ... (useState, useEffect hooks remain the same) ...
  const [isLoaded, setIsLoaded] = useState(false);
  // Initialize isInView to true if priority is true
  const [isInView, setIsInView] = useState(!!priority);
  const placeholderRef = useRef(null);

  useEffect(() => {
    if (priority || isInView) {
      // If priority, or already in view, it's effectively "in view"
      if (!isInView) setIsInView(true); // Ensure isInView is true if priority was initially false but became true
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
      {
        rootMargin: "0px 0px 100px 0px",
      }
    );

    const currentRef = placeholderRef.current;
    observer.observe(currentRef);

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [priority, isInView]); // Re-run if priority changes
  const commonImageProps = {
    src: cloudinaryMainImage(src, fill ? undefined : w, fill ? undefined : h),
    alt: alt || "image", // Ensure alt is passed through
    quality: quality,
    onLoad: () => setIsLoaded(true),
    priority: !!priority,
    sizes: sizes,
  };

  let imageStyle = {};
  let imageDimensionProps = {};

  if (fill) {
    imageDimensionProps.fill = true;
    imageStyle.objectFit = objectFit;
  } else {
    // For non-fill, Next/Image uses width/height for aspect ratio hints
    // and initial sizing, but it will still be responsive within its container.
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
        alt=""
        {...commonImageProps} // alt is included here
        {...imageDimensionProps}
        style={imageStyle}
        className={finalImageClassName}
        loading={priority ? "eager" : "lazy"}
        // Removed explicit alt="" here as it's covered by commonImageProps
      />
    );
  }

  // For non-priority images not yet in view, render the placeholder
  // The placeholder should fill its parent container, which already has the correct aspect ratio.
  return (
    <div
      ref={placeholderRef}
      // Make placeholder fill its parent, which is correctly sized by ProductCard
      // The parent (.relative.aspect-square.w-full) defines the dimensions.
      style={{ width: "100%", height: "100%" }}
      className={`image-placeholder rounded-md ${wrapperClassName || ""} blur`}
    >
      {/* Content can be added here if needed, e.g., a very low-res inline SVG or similar */}
    </div>
  );
}
