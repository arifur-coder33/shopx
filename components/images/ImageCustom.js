"use client";
import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
import Image from "next/image";
import { useState } from "react";

export default function Imagecustom({
  src,
  style,
  w,
  h,
  alt,
  priority,
  sizes,
  quality,
  loading,
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  return (
    <Image
      src={cloudinaryMainImage(src, w, h)}
      sizes={sizes}
      // loader={customLoader}
      className={`rounded-md  ${style}transition-opacity duration-500 ease-in-out ${
        isLoaded ? "remove-blur" : "blur"
      }`}
      // placeholder="blur"
      // blurDataURL="data:image/webp;base64,UklGRqoDAABXRUJQVlA4WAoAAAAgAAAAKwEAKwEASUNDUMgBAAAAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADZWUDggvAEAANAiAJ0BKiwBLAE/mczmaTk/sigilJhL8DMJaW7hdVEbqmVb8E2dBzYPjYPjYPjYPjYPjYPjYPjYPjYPjYPjYPjYPjYPjYPjYPjYPjYPjYPjYPjYPjYPjYPjYPjYPjYPjYPjYPjYPjYPjYOVVnwYglEs+8zzYILCJAkwmZBjMjrgAZedAwi01GyBzYCOp4/ayJVJg7uv8S770YdQoIMUxP05GyTvFjuxPfLqLhIj5al5RMHA3Xs6nBSI3IZuKDaIYfOhe6CmsLY3ChXBeTo1VaDAjyz0wPZxHtHqlJxGvzakVug5sHxsHxsHxsHxsHxsHxsHxsHxsHxsHxsHxsHxsHxsHxsHxsHxsHxsHxsHxsHxsHxsHxsHxsHxsHxsHxaAAP796MAAAABOP4Gbw4877zYl1xdySXKPQVaMVfr1SSq+F7hAaHVQw/OrG7A+Xc84ogl5fgEXXeiogTaHW7izJVnJ0Dgxt4JX3m4snuGEXE+fg+nw1t1BixUiqho74GWx5QC82oNlb/dBn/buLoNJM0iogqVIMbk9jp0LiejdVQAjWj2WFPIwGTN4YFE03kPWDZAr5DAAAAAAAAAAAA=="
      width={w}
      height={h}
      alt={alt ? alt : "image"}
      onLoad={() => setIsLoaded(true)}
      priority={priority}
      quality={quality}
      loading={loading}
    />
  );
}
