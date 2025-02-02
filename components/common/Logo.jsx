import { getSiteSetting } from "@/backend/serverActions/siteSettingAction";
import Imagecustom from "../images/ImageCustom";

export default async function Logo() {
  const { data } = await getSiteSetting({
    select: {
      logo: true,
      name: true,
    },
  });

  return (
    <div className="flex flex-row items-center text-3xl text-orange-600">
      {" "}
      {/* <Image
        src={
          "https://res.cloudinary.com/bdmart24/image/upload/w_50,h_50,f_auto,q_auto,dpr_auto/v1735555899/logo_fkajgn.png"
        }
        height={50}
        width={50}
        priority
        placeholder="blur"
        blurDataURL="https://res.cloudinary.com/bdmart24/image/upload/w_50,h_50,f_auto,q_auto,dpr_auto/v1735555899/logo_fkajgn.png"
        alt="logo"
      />
      <KalapanaFont> বিডি মার্ট24</KalapanaFont> */}
      <Imagecustom
        sizes="(max-width: 480px) 200px, 200px"
        className=" rounded-md "
        src={data?.logo}
        h={50}
        w={200}
        alt={`${data?.name}_logo ` || "logo"}
        priority
        quality={100}
      />
    </div>
  );
}
