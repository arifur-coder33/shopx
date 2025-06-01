import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
import ImageMagnifier from "../../_components/ImageMagnifier";
import MagnifierImage from "../../_components/ImageMagnifier";
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
       <div style={{ maxWidth: '1000px', margin: '20px auto' }}> {/* Example layout wrapper */}
          <ImageMagnifier
          smallImageSrc={product.smallImage.src}
          smallImageAlt={product.smallImage.alt}
          smallImageWidth={product.smallImage.width}
          smallImageHeight={product.smallImage.height}
          largeImageSrc={product.largeImage.src}
          largeImageWidth={product.largeImage.width} // Actual width of the large image file
          largeImageHeight={product.largeImage.height} // Actual height of the large image file
          magnifiedImageContainerWidth={300} // Desired width of the zoom window
          magnifiedImageContainerHeight={300} // Desired height of the zoom window
          // zoomFactor={3} // Optionally provide a zoom factor
        />
        </div>
      </>
    );
  }
}
