import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";

import Image from "next/image";

// This is now an ASYNC SERVER COMPONENT. No client-side JS!
export default function ImageCustomServer({
  src, // Image ID
  w,
  h,
  alt,
  priority,
  className,
  sizes,
  quality = 75,
  fetchPriority,
}) {
  // Do not block HTML on a second network request for a tiny placeholder.
  const finalSrc = cloudinaryMainImage(src, w, h);

  return (
    <>
      <Image
        src={src ? finalSrc : "/images/default.png"}
        width={w}
        height={h}
        alt={alt || "product image"}
        className={className}
        sizes={sizes}
        quality={quality}
        fetchPriority={fetchPriority}
        priority={priority} // If true, sets loading="eager". If false, sets loading="lazy".
        unoptimized={true} // Disable next/image optimization for Cloudinary images.
      />
    </>
  );
}
