import Image from "next/image";
import { customLoader } from "./Images-Loader";

export default function Imagecustom({
  src,
  style,
  w,
  h,
  alt,
  priority,
  sizes,
}) {
  return (
    <Image
      src={src}
      sizes={sizes}
      loader={customLoader}
      className={`rounded-md  ${style}`}
      placeholder="blur"
      blurDataURL="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
      width={w}
      height={h}
      alt={alt ? alt : "image"}
      priority={priority}
    />
  );
}
