import ImageZoomer from "../../_components/ImageZoomer"; // Use the final component

export default function Images({ mainImage, imageGallery = [], title }) {
  const uniqueGalleryIds = imageGallery.filter((id) => id !== mainImage);

  const productImages = [
    // 1. The main image is always first.
    {
      id: mainImage,
      alt: title || "Main product image",
    },
    ...uniqueGalleryIds.map((imgId, index) => ({
      id: imgId,
      alt: `Product image ${index + 2}`,
    })),
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
