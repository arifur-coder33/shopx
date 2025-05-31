import MagnifierImage from "../../_components/MagnifierImage";
export default function Images({ mainImage, title }) {
  {
    return (
      <>
        {/* <ProductMainImage title={title} image={mainImage} /> */}
        <div className="p-10">
          <MagnifierImage src={mainImage} alt="Product Zoom" />
        </div>
      </>
    );
  }
}
