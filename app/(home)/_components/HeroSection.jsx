import Image from "next/image";

export default function HeroSection() {
  return (
    <Image
      alt="banner"
      src={"/images/banner.png"}
      width={1280}
      height={300}
      className="md:max-h-[500] rounded-3xl py-1"
      priority
    />
  );
}
