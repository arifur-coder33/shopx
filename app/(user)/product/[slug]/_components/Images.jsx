import { ProductImageGallery } from "./Images/ProductImagegallery";
import ProductMainImage from "./Images/ProductMainImage";

export default function Images({ images }) {
  {
    return (
      <>
        <ProductMainImage image={images[0]} />
        <div className="flex flex-row gap-1 mt-1">
          <ProductImageGallery />
          <ProductImageGallery />
          <ProductImageGallery />
        </div>
      </>
    );
  }
}
