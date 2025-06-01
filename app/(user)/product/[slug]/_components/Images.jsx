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
      <div style={{ padding: '20px' }}> {/* Add some padding for visual clarity */}
        <ImageMagnifier
          smallImageSrc={product.smallImage.src}
          smallImageAlt={product.smallImage.alt}
          smallImageWidth={product.smallImage.width}
          smallImageHeight={product.smallImage.height}
          largeImageSrc={product.largeImage.src}
          largeImageWidth={product.largeImage.width}
          largeImageHeight={product.largeImage.height}
          
          // Desktop settings
          magnifiedImageContainerWidth={500}
          magnifiedImageContainerHeight={500}
          magnifierOffset={{ x: 20, y: 0 }} // Gap between small image and zoom panel

          // Mobile "Glass Magnifier" settings
          glassMagnifierSize={120} // Diameter of the circular lens on mobile
          
          // Optional: if you want to force a specific zoom level for both
          // zoomFactor={4} 
        />
      </div>
      </>
    );
  }
}
