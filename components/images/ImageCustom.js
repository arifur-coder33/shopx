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
"use client";
import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";

export default function Imagecustom({
  src,
  style, // This style will be applied to the wrapper for placeholder
  w,
  h,
  alt,
  priority, // If true, we'll bypass IntersectionObserver
  sizes,
  quality,
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const placeholderRef = useRef(null);

  useEffect(() => {
    // If priority is true, image should load immediately, so set isInView true
    if (priority) {
      setIsInView(true);
      return;
    }

    // If no ref, or already in view (e.g. from priority), do nothing
    if (!placeholderRef.current || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Update state when element comes into view
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(entry.target); // No need to observe anymore
        }
      },
      {
        // Optional: Adjust rootMargin to trigger loading slightly before
        // the element is fully in view. E.g., "0px 0px 200px 0px"
        // means it will trigger when the element is 200px from the bottom edge
        // of the viewport.
        rootMargin: "0px 0px 100px 0px", // Load 100px before it's visible
      }
    );

    observer.observe(placeholderRef.current);

    return () => {
      // Disconnect observer on unmount
      if (placeholderRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        observer.unobserve(placeholderRef.current);
      }
    };
  }, [priority, isInView]); // Re-run if priority changes or if isInView was somehow set externally

  // If priority is true, render the image directly
  if (priority) {
    return (
      <Image
        src={cloudinaryMainImage(src, w, h)}
        sizes={sizes}
        className={`rounded-md ${style || ""} ${ // Added style here
          isLoaded ? "remove-blur" : "blur"
        }`}
        width={w}
        height={h}
        alt={alt ? alt : "image"}
        onLoad={() => setIsLoaded(true)}
        priority={true} // Explicitly true
        quality={quality}
      />
    );
  }

  // For non-priority, use Intersection Observer
  return (
    <div
      ref={placeholderRef}
      style={{  height: h }} // Ensure placeholder takes up space
      className={`rounded-md ${style || ""} ${ // Apply style to wrapper
        isInView && isLoaded ? "remove-blur" : "blur" // Keep blur until loaded AND in view
      }`}
    >
      {isInView ? (
        <Image
          src={cloudinaryMainImage(src, w, h)}
          sizes={sizes}
          // No specific className for blur here, handled by parent div or can be added if needed
          className={`rounded-md ${isLoaded ? "remove-blur" : "blur"}`} // This would make Image itself blur/unblur
        
          width={w}
          height={h}
          alt={alt ? alt : "image"}
          onLoad={() => setIsLoaded(true)}
          priority={false} // Explicitly false
          quality={quality}
          loading="lazy" // Still good to keep for browsers that support it well
        />
      ) : (
        // Optional: A visible placeholder content while not in view
        // The div itself acts as a placeholder maintaining dimensions.
        // You could add a spinner or a specific background color.
        // For now, the blur class on the div handles the visual.
        null
      )}
    </div>
  );
}