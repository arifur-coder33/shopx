import Image from "next/image";
import KalapanaFont from "../KalapanaFont";

export default function Logo() {
  return (
    <div className="flex flex-row items-center text-3xl text-orange-600">
      {" "}
      <Image
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
      <KalapanaFont> বিডি মার্ট২৪</KalapanaFont>
    </div>
  );
}
