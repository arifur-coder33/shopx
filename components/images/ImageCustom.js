import Image from "next/image";
import { customLoader } from "./Images-Loader";

export default function Imagecustom({src,style,w,h,alt,priority}){
    return (
        <Image
        src={
          "/photo-1556637640-2c80d3201be8?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8M3x8c25lYWtlcnxlbnwwfHwwfHw%3D&auto=format&fit=crop&w=75&q=50"
        }
        loader={customLoader}
        className={`rounded-md  ${style}`}
        placeholder="blur"
        blurDataURL="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
        width={w}
        height={h}
        alt={alt?alt:"image"}
        priority={priority}
      />
    )
}