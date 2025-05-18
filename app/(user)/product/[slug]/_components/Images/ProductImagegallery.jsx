import Imagecustom from "@/components/images/ImageCustom";
export function ProductImageGallery({ imageGallery, title }) {
  
  if (imageGallery?.length === 0) return;
  return (
    <div className="flex gap-2 flex-col">
      Image gallery
      {imageGallery?.length > 0 &&
        imageGallery.map((image) => {
          return (
           

            <Imagecustom
              key={image}
              sizes="(max-width: 768px) 300px, (max-width: 1200px) 400px, 800px"
              src={image}
              w={800}
              h={800}
              alt={title}
          
              priority={false}
            />
          );
        })}
    </div>
  );
}
