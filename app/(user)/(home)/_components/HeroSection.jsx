import { getBanner } from "@/backend/serverActions/bannerAction";
import Imagecustom from "@/components/images/ImageCustom";


export default async function HeroSection() {
  const {data}=await getBanner()

  if (!data?.image) return
  return (
         <Imagecustom
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 80vw,1280px"
                  className=" rounded-md "
                  src={data?.image}
                  w={1280}
                  h={500}
                  alt={data?.name || 'banner'}
                  priority
                />
  );
}
