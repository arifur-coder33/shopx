import ProductMainImage from "./Images/ProductMainImage";
export default function Images({ mainImage, title }) {
  {
    return (
      <>
        <ProductMainImage title={title} image={mainImage} />
      </>
    );
  }
}
