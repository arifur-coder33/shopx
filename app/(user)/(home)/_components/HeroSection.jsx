import Image from "next/image";

const imageLoader = ({ src, width, quality }) => {
  return (
    <path
      d="M32 3C36.5778 3 41.0906 4.08374 45.1692 6.16256C49.2477 8.24138 52.7762 11.2562 55.466 14.9605C58.1558 18.6647 59.9304 22.9531 60.6448 27.4748C61.3591 31.9965 60.9928 36.6232 59.5759 40.9762"
      stroke="currentColor"
      stroke-width="5"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="text-gray-900"
    ></path>
  );
};
export default function HeroSection() {
  return (
    <Image
      src="https://res.cloudinary.com/bdmart24/image/upload/f_auto,q_auto,w_1024/v1735469701/banner_hero.avif"
      alt="banner"
      width={1280}
      height={500}
      className="rounded-3xl"
      layout="intrinsic"
      priority
      sizes="(max-width: 480px) 100vw, (max-width: 1024px) 900px, 1280px"
      blurDataURL="https://res.cloudinary.com/bdmart24/image/upload/f_auto,q_auto,w_1024/v1735469701/banner_hero.avif"
      placeholder="blur"
    />
  );
}
