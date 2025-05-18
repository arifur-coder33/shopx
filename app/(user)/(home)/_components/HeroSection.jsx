import { getBanner } from "@/backend/serverActions/bannerAction";
import Imagecustom from "@/components/images/ImageCustom";

export default async function HeroSection() {
  const { data } = await getBanner();
  console.log(data);
  if (!data?.thumbnail) return;
  return (
    <Imagecustom
      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 80vw,1280px"
      style="border-2 border-b-8 rounded-3xl border-orange-500 "
      src={data?.thumbnail?.name}
      w={1280}
      h={500}
      alt={data?.name || "banner"}
      priority={true}
    />
  );
}
