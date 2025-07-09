// app/your-page/HeroSection.js

import { getBanner } from "@/backend/serverActions/bannerAction";
import Imagecustom from "@/components/images/ImageCustom"; // <-- Use your component
import { unstable_cache } from "next/cache";

// Data fetching remains the same.
export const getCachedBanner = unstable_cache(
  async () => getBanner(),
  ["my-banner"],
  { revalidate: 3600 }
);

// Make the component async because Imagecustom is now async
export default async function HeroSection() {
  const { data } = await getCachedBanner();

  if (!data?.thumbnail?.name) {
    return (
      <div className="w-full aspect-[1280/500] bg-gray-200 rounded-md animate-pulse"></div>
    );
  }

  return (
    // The responsive container is still essential.
    // It defines the shape that Imagecustom will fill.
    <div className="relative w-full aspect-[1280/500] overflow-hidden rounded-md">
      <Imagecustom
        src={data.thumbnail.name}
        alt={data?.name || "Hero Banner"}
        // --- Activate Fill Mode ---
        fill={true}
        objectFit="cover"
        urlWidthHint={1280} // A hint for the Cloudinary URL quality
        // --- Performance Props ---
        sizes="(max-width: 768px) 100vw, 1280px"
        priority={true} // MOST IMPORTANT PROP
      />
    </div>
  );
}
