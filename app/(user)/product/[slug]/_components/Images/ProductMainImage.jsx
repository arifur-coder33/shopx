import Imagecustom from "@/components/images/ImageCustom";
import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";

export default function ProductMainImage({ image, title }) {
  const mainImageUrl = cloudinaryMainImage(image, 800, 800);

  return (
    <Imagecustom
      sizes="(max-width: 768px) 300px, (max-width: 1200px) 400px, 800px"
      className=" rounded-md "
      placeholder="blur"
      src={image}
      w={400}
      h={400}
      alt={title}
    />

    // <Image
    //   src={mainImageUrl}
    //   alt={title}
    //   width={400}
    //   height={400}
    //   placeholder="blur"
    //   blurDataURL={mainImageUrl}
    //   sizes="(max-width: 768px) 300px, (max-width: 1200px) 400px, 800px"
    //   layout="intrinsic"
    //   priority
    // />
  );
}
