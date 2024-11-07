import Image from "next/image";

export default function HeroSection() {
  return (
    <div className="relative">
      <Image
        alt="banner"
        src={"/images/banner.webp"}
        className=" rounded-3xl py-1 object-cover"
        width={1280}
        height={500}
        priority
        placeholder="blur"
        blurDataURL="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
      />
    </div>
  );
}
