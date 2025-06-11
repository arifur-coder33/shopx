// // your .../_components/Images.js file
// import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
// import ImageMagnifier from "../../_components/ImageMagnifier";

// export default function Images({ mainImage, title }) {
//   const product = {
//     smallImage: {
//       src: cloudinaryMainImage(mainImage, 500, 500),
//       alt: title || 'Product Image',
//     },
//     largeImage: {
//       src: cloudinaryMainImage(mainImage, 1600, 1600),
//       width: 1600,
//       height: 1600,
//     },
//   };

//   return (
//     <div className="max-w-[500px]">
//       <ImageMagnifier
//         smallImageSrc={product.smallImage.src}
//         smallImageAlt={product.smallImage.alt}
//         aspectRatio="1/1"
//         largeImageSrc={product.largeImage.src}
//         largeImageWidth={product.largeImage.width}
//         largeImageHeight={product.largeImage.height}
        
//         overlayColor="rgba(0, 0, 0, 0.5)"

//         // --- Desktop Zoom Panel ---
//         magnifiedImageContainerWidth={400}
//         magnifiedImageContainerHeight={400}
//         magnifierOffset={{ x: 25, y: 0 }}

//         // --- Mobile Magnifying Glass ---
//         mobileMagnifierSize={160}
//         // Sets the padding from the image edge for the mobile magnifier.
//         // The component now automatically handles positioning.
//         mobileMagnifierPadding={15}
//       />
//     </div>
//   );
// }

///---------------------------- imager zoomer 

// your .../_components/Images.js file
// your .../_components/Images.js file
import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
import ImageZoomer from "../../_components/ImageZoomer"; // Use the final component

export default function Images({ mainImage, imageGallery = [], title }) {

  // Create the structured array the component expects
  const productImages = [
    {
      small: cloudinaryMainImage(mainImage, 600, 600),
      large: cloudinaryMainImage(mainImage, 1800, 1800),
      alt: title || 'Main product image',
    },
    // Add the other images from your product data
    ...imageGallery.map((img, index) => ({
      small: cloudinaryMainImage(img, 600, 600),
      large: cloudinaryMainImage(img, 1800, 1800),
      alt: `Product image ${index + 2}`,
    }))
  ];

  return (
    <div className="max-w-[500px] w-full">
      <ImageZoomer
        images={productImages}
        aspectRatio="1/1"
        overlayBackgroundColor="rgba(0, 0, 0, 0.9)"
      />
    </div>
  );
}