import { customLoader } from "@/components/images/Images-Loader";
import Image from "next/image";

export function ProductImageGallery({image}) {
    return (
    <>
      <Image
        src={
          image
        }
        loader={customLoader}
        className=" rounded-md md:w-[75px]"
        placeholder="blur"
        blurDataURL="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
      sizes="40px"
        width={50}
        height={50}
        alt="image"
      />

      
    </>

      
    );
  }