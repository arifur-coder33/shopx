// src/components/common/Logo.js (CRITICAL FIX)
import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
import Image from "next/image"; // Use the standard component!

// This is now a simple, synchronous Server Component. No more `async`.
export default function Logo({ data }) {
  if (!data?.logo) return null; // Or return a text fallback

  return (
    <div className="flex flex-row items-center text-3xl text-orange-600">
      <Image
        // DO NOT USE Imagecustom here. This is the fix.
        src={cloudinaryMainImage(
          data.logo,
          200, // Width for the logo
          50 // Height for the logo
        )}
        width={200}
        height={50}
        alt={`${data.name}_logo` || "logo"}
        priority={true} // Crucial: tells browser to load this early
        sizes="(max-width: 480px) 200px, 200px"
        className="rounded-md"
      />
    </div>
  );
}
