import { customLoader } from "@/components/images/Images-Loader";
import Image from "next/image";

export function ProductImageGallery() {
    return (
    <>
      <Image
        src={
          "/photo-1556637640-2c80d3201be8?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8M3x8c25lYWtlcnxlbnwwfHwwfHw%3D&auto=format&fit=crop&w=75&q=50"
        }
        loader={customLoader}
        className=" rounded-md md:w-[75px]"
        placeholder="blur"
        blurDataURL="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
        width={50}
        height={50}
        alt="image"
      />

      
    </>

      
    );
  }