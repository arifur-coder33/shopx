import Image from "next/image";

export default function HeroSection() {
  return (
    // <Image
    //   alt="banner"
    //   src={"/images/banner.png"}
    //   width={1280}
    //   height={300}
    //   className="md:max-h-[500] rounded-3xl py-1"
    //   priority
    // />

    <div className="relative w-full h-[300px] md:h-[500px] rounded-3xl overflow-hidden">
      <Image
        alt="banner"
        src="/images/banner.png"
        layout="fill"
        className="object-cover"
        priority
      />
    </div>
  );
}
