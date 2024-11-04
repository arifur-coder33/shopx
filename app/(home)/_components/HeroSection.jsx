import Image from "next/image";

export default function HeroSection() {
  return (
    <Image
      alt="banner"
      src={"/images/banner.png"}
      width={1280}
      height={300}
      className="md:h-[500]"
    />
  );
}
