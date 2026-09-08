import { getHeroSlidesForAdmin } from "@/backend/serverActions/bannerAction";
import HeroSliderManager from "./_components/HeroSliderManager";

export const dynamic = "force-dynamic";

export default async function BannerPage() {
  const result = await getHeroSlidesForAdmin();
  return <HeroSliderManager result={result} />;
}
