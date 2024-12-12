import { ProductImageGallery } from "./Images/ProductImagegallery";
import ProductMainImage from "./Images/ProductMainImage";

export default function Images({ imageGallery, mainImage, title }) {
  {
    return (
      <>
        <ProductMainImage title={title} image={mainImage} />
        {imageGallery?.length > 0 && (
          <div className="flex flex-row gap-1 mt-1">
            {imageGallery?.map((image) => (
              <ProductImageGallery key={image} title={title} image={image} />
            ))}
          </div>
        )}
      </>
    );
  }
}
