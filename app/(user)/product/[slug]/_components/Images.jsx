import { ProductImageGallery } from "./Images/ProductImagegallery";
import ProductMainImage from "./Images/ProductMainImage";

export default function Images({ images, title }) {
  {
    return (
      <>
        <ProductMainImage title={title} image={images[0]} />
        <div className="flex flex-row gap-1 mt-1">
          <ProductImageGallery title={title} image={images[0]} />
          <ProductImageGallery title={title} image={images[0]}/>
          <ProductImageGallery title={title} image={images[0]}/>
        </div>
      </>
    );
  }
}
