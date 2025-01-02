import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
import Image from "next/image";

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
      src={cloudinaryMainImage(src,w,h)}
      sizes={sizes}
      // loader={customLoader}
      className={`rounded-md  ${style}`}
      placeholder="blur"
      blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAgMBAQUAdo4AAAAASUVORK5CYII="
      width={w}
      height={h}
      alt={alt ? alt : "image"}
      priority={priority}
    />
  );
}
