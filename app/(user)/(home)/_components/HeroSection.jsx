// import { getBanner } from "@/backend/serverActions/bannerAction";
// import Imagecustom from "@/components/images/ImageCustom";

// import { unstable_cache } from "next/cache";

// export const getCachedBanner = unstable_cache(
//   async () => getBanner(),
//   ["my-banner"],
//   { revalidate: 3600 }
// );
// export default async function HeroSection() {
//   const { data } = await getCachedBanner();
//   console.log(data);
//   if (!data?.thumbnail) return;
//   return (
//     <>
//       <Imagecustom
//         sizes="(max-width: 768px) 100vw, (max-width: 1024px) 80vw,1280px"
//         style="border-2 border-b-8 rounded-3xl border-orange-500 "
//         src={data?.thumbnail?.name}
//         w={1280}
//         h={500}
//         alt={data?.name || "banner"}
//         priority={true}
//         objectFit="fit"
//       />
//     </>
//   );
// }

// app/your-page/HeroSection.js

import { getBanner } from "@/backend/serverActions/bannerAction";
import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
import { unstable_cache } from "next/cache";
import Image from "next/image"; // <--- Import the standard next/image

// Your data fetching is great, keep it as is.
export const getCachedBanner = unstable_cache(
  async () => getBanner(),
  ["my-banner"],
  { revalidate: 3600 }
);

export default async function HeroSection() {
  const { data } = await getCachedBanner();

  if (!data?.thumbnail?.name) {
    // This is a good fallback for when no image exists
    return (
      <div className="w-full aspect-[1280/500] bg-gray-200 rounded-3xl animate-pulse"></div>
    );
  }

  // Use the standard next/image component for your LCP element
  return (
    <Image
      // Generate the Cloudinary URL directly here.
      // You can move the `cloudinaryMainImage` function to a shared utils file.
      src={cloudinaryMainImage(
        data.thumbnail.name,
        1280, // Width for the image
        500 // Height for the image
      )}
      // Essential props for LCP optimization
      width={1280}
      height={500}
      alt={data?.name || "Banner"}
      priority={true} // Same as loading="eager" AND fetchpriority="high"
      // Your styling props
      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 80vw, 1280px"
      className="rounded-md"
      style={{ objectFit: "fit" }} // Use style for objectFit
    />
  );
}
