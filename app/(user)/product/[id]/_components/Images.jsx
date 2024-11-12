import { ProductImageGallery } from "./Images/ProductImagegallery";
import ProductMainImage from "./Images/ProductMainImage";

export default function Images(){{
    return(
        <>
        <ProductMainImage/>
     <div className="flex flex-row gap-1 mt-1">
      <ProductImageGallery/>
      <ProductImageGallery/>
      <ProductImageGallery/>
      </div>
        </>
    )
}}