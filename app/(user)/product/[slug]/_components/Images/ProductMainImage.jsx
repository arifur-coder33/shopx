import Imagecustom from "@/components/images/ImageCustom";
import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";

export default function ProductMainImage({ image, title }) {
  const mainImageUrl = cloudinaryMainImage(image, 800, 800);

  return (
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

    <Imagecustom
      sizes="(max-width: 768px) 300px, (max-width: 1200px) 400px, 800px"
      src={image}
      w={500}
      h={500}
      alt={title}
      priority={true}
    />
  );
}
