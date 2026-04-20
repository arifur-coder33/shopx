// src/components/common/Logo.js (CRITICAL FIX)
import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
import Image from "next/image"; // Use the standard component!

// This is now a simple, synchronous Server Component. No more `async`.
export default function Logo({ data }) {
  return (
    <div className=" flex flex-row items-center text-3xl text-orange-600 ring-2 ring-slate-200 rounded-full ">
      <Image
        // DO NOT USE Imagecustom here. This is the fix.
        src={
          data?.logo ? cloudinaryMainImage(data.logo) : "/images/default.png"
        }
        width={60}
        height={60}
        alt={`${data?.name || "logo"}`}
        priority={true} // Crucial: tells browser to load this early
        sizes="(max-width: 480px) 200px, 200px"
        className="rounded-md"
      />
    </div>
  );
}
