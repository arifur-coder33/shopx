import { cloudinaryMainImage, getBase64ImageUrl } from "@/utils/cloudinaryUrl";

import Image from "next/image";

// This is now an ASYNC SERVER COMPONENT. No client-side JS!
export default async function ImageCustomServer({
  src, // Image ID
  w,
  h,
  alt,
  priority,
  className,
  sizes,
  quality = 75,
  unoptimized,
  fetchPriority,
}) {
  // Generate the full-size image URL and the blur placeholder URL in parallel

  const [blurDataURL, finalSrc] = await Promise.all([
    getBase64ImageUrl(src), // Generate the blur placeholder
    cloudinaryMainImage(src, w, h),
  ]);

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
        placeholder="blur"
        // Let next/image handle everything automatically!
        priority={priority} // If true, sets loading="eager". If false, sets loading="lazy".
        blurDataURL={blurDataURL} // Provide the data for the blur.
        unoptimized={true} // Disable next/image optimization for Cloudinary images.
      />
    </>
  );
}
