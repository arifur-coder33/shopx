import Image from "next/image";

export default function HeroSection() {
  return (
    <div className="relative  w-[1280px] h-[500px]">
      <Image
        alt="banner"
        src={"/images/banner.webp"}
        className=" rounded-3xl py-1 object-cover"
        fill
        placeholder="blur"
        blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
      />
    </div>
  );
}
