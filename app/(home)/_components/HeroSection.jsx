import Image from "next/image";

export default function HeroSection() {
  return (
    <div className="h-300 md:h-500">
      <Image
        alt="banner"
        src={"/images/banner.png"}
        width={1280}
        height={300}
        className="md:max-h-[500] rounded-3xl py-1"
        priority
        placeholder="blur"
        blurDataURL="data:image/png;base64"
      />
    </div>
  );
}
