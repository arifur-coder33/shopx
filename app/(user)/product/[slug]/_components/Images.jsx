// your .../_components/Images.js file
import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
import ImageMagnifier from "../../_components/ImageMagnifier"; // Make sure this path is correct

export default function Images({ mainImage, title }) {
   const product = {
    smallImage: {
      src:  cloudinaryMainImage(mainImage, 600, 600), // Or your preferred small image size from Cloudinary
      alt: title || 'Product Image',
    },
    largeImage: {
      // Ensure this is a significantly higher resolution version for good zoom quality
      src:  cloudinaryMainImage(mainImage, 1800, 1800), // e.g., 3x the small image dimensions
      width: 1800, // Actual width of this large image file
      height: 1800, // Actual height of this large image file
    },
  };

  // Determine aspect ratio from your Cloudinary call if needed, or set a fixed one
  // For example, if your cloudinaryMainImage(mainImage, 600, 600) always returns a square image
  const intendedAspectRatio = "1/1"; // Or calculate if dynamic: product.smallImage.width / product.smallImage.height

  return (
    <>
      {/* The parent div of ImageMagnifier will dictate its available width.
          In your ProductPage.js, this is the div with "col-span-3". */}
      <div> 
        <ImageMagnifier
          smallImageSrc={product.smallImage.src}
          smallImageAlt={product.smallImage.alt}
          
          // --- Aspect Ratio ---
          // If your small images are always square (e.g. 600x600 source from Cloudinary), use "1/1".
          // If they have varying aspect ratios and you want to preserve that: pass `null`
          // (but ensure your CSS/layout supports varying heights).
          // For consistency, "1/1" is often good for product carousels/main images.
          aspectRatio={intendedAspectRatio} 

          // --- Large Image Details (for zoom) ---
          largeImageSrc={product.largeImage.src}
          largeImageWidth={product.largeImage.width}
          largeImageHeight={product.largeImage.height}
          
          // --- Desktop Zoom Panel Customization ---
          magnifiedImageContainerWidth={350} // Width of the side zoom panel on desktop
          magnifiedImageContainerHeight={350} // Height of the side zoom panel on desktop
          magnifierOffset={{ x: 20, y: 0 }} // Gap between small image and desktop zoom panel

          // --- Mobile Top Zoom Panel Customization (New UI) ---
          mobileZoomPanelHeight={120} // Height of the top zoom panel on mobile
          mobileZoomPanelTopOffset={5} // Distance from the top of the small image
          mobileZoomPanelWidthPercentage={95} // Panel width as % of small image (e.g. 95%)

          // Optional: You can set an explicit zoomFactor if you don't want it auto-calculated
          // zoomFactor={3} 
        />
      </div>
    </>
  );
}