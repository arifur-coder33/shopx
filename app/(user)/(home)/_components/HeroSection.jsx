import Image from "next/image";

export default function HeroSection() {
  return (
    <Image
      src="https://res.cloudinary.com/bdmart24/image/upload/f_auto,q_auto,w_1280/v1735469701/banner_hero.avif"
      alt="banner"
      width={1280}
      height={500}
      priority
      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 80vw,1280px"
      blurDataURL="https://res.cloudinary.com/bdmart24/image/upload/e_blur:200/q_1,w_1024,h_500/v1735469701/banner_hero.jpg"
      placeholder="blur"
    />
  );
}
