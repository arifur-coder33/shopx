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
            ? cloudinaryMainImage(data.logo, 96)
            : "/images/default-64.webp"
        }
        width={60}
        height={60}
        alt={`${data?.name || "logo"}`}
        priority={true} // Crucial: tells browser to load this early
        unoptimized
        sizes="(max-width: 767px) 44px, 60px"
        className="h-11 w-11 rounded-brand object-contain md:h-15 md:w-15"
      />
    </div>
  );
}
