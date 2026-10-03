import { cloudinaryMainImage } from "./cloudinaryUrl";

// Match the product's single mobile column and half-width desktop column.
export const PRODUCT_IMAGE_SIZES =
  "(max-width: 767px) calc(100vw - 48px), (max-width: 1279px) calc(50vw - 64px), 600px";

export function productImageSources(imageId) {
  return {
    src: cloudinaryMainImage(imageId, 640),
    srcSet: [320, 480, 640, 768, 960, 1200]
      .map((width) => `${cloudinaryMainImage(imageId, width)} ${width}w`)
      .join(", "),
    sizes: PRODUCT_IMAGE_SIZES,
  };
}
