import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
import styles from "./ProductImageGallery.module.css";

export default function ProductStaticGallery({ data, initialImage }) {
  const photos = new Map();
  [data.thumbnail, ...(data.gallery || []), ...(data.variations || []).map((item) => item.thumbnail)]
    .forEach((image) => {
      if (image?.id && image.name && !photos.has(image.id)) photos.set(image.id, image);
    });
  const videos = data.videos?.length ? data.videos : data.videoUrl ? [{ url: data.videoUrl }] : [];
  return (
    <div className={styles.galleryContainer}>
      <div className={styles.layoutWrapper}>
        <div className={styles.mainImageContainer}>{initialImage}</div>
        {photos.size + videos.length > 1 && (
          <div className={styles.thumbnailList}>
            {[...photos.values()].map((image, index) => (
              <button key={image.id} type="button" data-product-media={image.id} aria-label={`ছবি খুলুন: ${data.title}`} className={`${styles.thumbnailButton} ${index === 0 ? styles.thumbnailActive : ""}`}>
                {/* Cloudinary already resizes this asset; avoid a second optimizer. */}
                <img src={cloudinaryMainImage(image.name, 60)} width={60} height={60} alt={data.title} className={styles.thumbnailImage} loading="lazy" decoding="async" fetchPriority="low" />
              </button>
            ))}
            {videos.map((video, index) => (
              <button key={video.id || index} type="button" data-product-media={video.id || video.url} aria-label="ভিডিও খুলুন" className={`${styles.thumbnailButton} bg-surface-muted text-primary`}>▶</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
