import Imagecustom from "@/components/images/ImageCustom";
import { customLoader } from "@/components/images/Images-Loader";

export default function ProductMainImage({ image }) {
  return (
    <Imagecustom
      src={image}
      sizes="(max-width: 480px) 300px, (max-width: 768px) 500px, 650px"
      loader={customLoader}
      style="rounded-md"
      placeholder="blur"
      blurDataURL="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
      h={650}
      w={650}
      alt="image"
      priority
    />
    // <Image
    // src="/photo-1556637640-2c80d3201be8?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8M3x8c25lYWtlcnxlbnwwfHwwfHw%3D&auto=format&fit=crop&w=500&q=75"
    // sizes="(max-width: 480px) 300px, (max-width: 768px) 500px, 650px"
    // loader={customLoader}
    // className="rounded-md"
    // placeholder="blur"
    // blurDataURL="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
    // width={650}
    // height={650}
    // alt="image"
    // priority
    // />
  );
}
