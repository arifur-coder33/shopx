import { getActiveHeroSlides } from "@/backend/serverActions/bannerAction";
import { cloudinaryResponsiveImage } from "@/utils/cloudinaryUrl";
import HeroSliderClient from "./HeroSliderClient";

export default async function HeroSlider() {
  const result = await getActiveHeroSlides();
  if (!result.success || !result.data.length) return null;

  const slides = result.data.map((slide) => ({
    id: slide.id,
    title: slide.title,
    link: slide.link,
    motion: slide.motion,
    mobileSrc: cloudinaryResponsiveImage(slide.image.name, 768, "good"),
    tabletSrc: cloudinaryResponsiveImage(slide.image.name, 1024, "good"),
    desktopSrc: cloudinaryResponsiveImage(slide.image.name, 1600, "good"),
  }));

  return <HeroSliderClient slides={slides} />;
}
