import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
import ImageMagnifier from "../../_components/ImageMagnifier";
export default function Images({ mainImage, title }) {
   const product = {
    smallImage: {
      src:  cloudinaryMainImage(mainImage, 400, 400), // e.g., 600x400
      width: 400,
      height: 400,
      alt: 'Amazing Product View 1',
    },
    largeImage: {
        src:  cloudinaryMainImage(mainImage, 1600, 1600),
      width: 1600,
      height: 1600,
    },
  };
  {
    return (
      <>
        {/* <ProductMainImage title={title} image={mainImage} /> */}
   <div >
        <ImageMagnifier
          smallImageSrc={product.smallImage.src}
          smallImageAlt={product.smallImage.alt}
          // aspectRatio="1/1" // The wrapper above will define width, aspect-ratio defines height
                           // Or, if your images are always square, you can hardcode "1/1"
                           // If images have varying aspects, and you want to preserve them:
          aspectRatio={null} // Will try to use natural aspect with layout="responsive"

          largeImageSrc={product.largeImage.src}
          largeImageWidth={product.largeImage.width}
          largeImageHeight={product.largeImage.height}
          
          magnifiedImageContainerWidth={300}
          magnifiedImageContainerHeight={300}
          magnifierOffset={{ x: 10, y: 0 }}

          glassMagnifierSize={120}
          // This offsets the *UI of the glass* upwards from the finger.
          // The content *inside* the glass still corresponds to the touch point.
          mobileGlassMagnifierUIVisibleOffset={{ x: 0, y: -80 }} 
        />
      </div>
      </>
    );
  }
}
