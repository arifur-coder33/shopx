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
// your .../_components/Images.js file
// your .../_components/Images.js file
import ImageZoomer from "../../_components/ImageZoomer"; // Use the final component

export default function Images({ mainImage, imageGallery = [], title }) {

  // --- De-duplication Logic ---
  // Filter the gallery to remove any ID that matches the main image.
  const uniqueGalleryIds = imageGallery.filter(id => id !== mainImage);
  
  // --- Data Structuring Logic ---
  // Create the structured array the component expects.
  const productImages = [
    // 1. The main image is always first.
    {
      id: mainImage,
      alt: title || 'Main product image',
    },
    // 2. Spread the unique gallery images after it.
    ...uniqueGalleryIds.map((imgId, index) => ({
      id: imgId,
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