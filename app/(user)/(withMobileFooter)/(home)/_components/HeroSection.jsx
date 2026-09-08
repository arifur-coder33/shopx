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
import { cloudinaryResponsiveImage } from "@/utils/cloudinaryUrl";
export default async function HeroSection() {
  const { data } = await getBanner();

  if (!data?.thumbnail?.name) {
    // This is a good fallback for when no image exists
    return (
      <div className="w-full aspect-[1280/500] bg-gray-200 rounded-3xl animate-pulse"></div>
    );
  }

  const mobileSrc = cloudinaryResponsiveImage(data.thumbnail.name, 480);
  const tabletSrc = cloudinaryResponsiveImage(data.thumbnail.name, 768);
  const desktopSrc = cloudinaryResponsiveImage(data.thumbnail.name, 1280);

  // A single URL per breakpoint intentionally caps the downloaded banner size.
  // This also renders without waiting for next/image hydration or blur removal.
  return (
    <picture>
      <source media="(max-width: 639px)" srcSet={mobileSrc} />
      <source media="(max-width: 1023px)" srcSet={tabletSrc} />
      <img
        src={desktopSrc}
        width="1280"
        height="500"
        alt={data?.name || "Banner"}
        loading="eager"
        fetchPriority="high"
        decoding="async"
        className="block h-auto w-full rounded-md"
      />
    </picture>
  );
}
