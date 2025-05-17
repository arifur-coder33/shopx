import { Suspense } from "react";
import ProductMainImage from "./Images/ProductMainImage";
export default function Images({ mainImage, title }) {
  {
    return (
      <>
        <Suspense
          fallback={
            <div className="w-full h-full bg-gray-200 animate-pulse"></div>
          }
        >
          <ProductMainImage title={title} image={mainImage} />
        </Suspense>
      </>
    );
  }
}
