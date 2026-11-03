// src/components/common/Logo.js (CRITICAL FIX)
import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
import Image from "next/image"; // Use the standard component!

// This is now a simple, synchronous Server Component. No more `async`.
export default function Logo({ data }) {
  return (
    <div className="flex items-center text-brand">
      <Image
        // DO NOT USE Imagecustom here. This is the fix.
        src={
          data?.logo
            ? cloudinaryMainImage(data.logo, 200)
            : "/images/default-64.webp"
        }
        width={300}
        height={60}
        alt={`${data?.name || "logo"}`}
        priority={true} // Crucial: tells browser to load this early
        unoptimized
        sizes="40vw"
        className="block h-8 w-auto max-w-[32vw] object-contain md:h-12 md:max-w-[240px]"
      />
    </div>
  );
}
