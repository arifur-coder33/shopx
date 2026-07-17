// file: app/product/_components/ProductImageGalleryServer.js

// NO "use client". This is a Server Component.
import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
import Image from "next/image";
import styles from "./ProductImageGallery.module.css";

// A simple SVG icon component for the server
const VideoThumbnailIcon = () => (
  <div className={styles.videoThumbnailOverlay}>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  </div>
);

export default function ProductImageGalleryServer({
  children, // This is the prioritized <Image> from page.js
  mainImage,
  gallery = [],
  title,
  variationsImage = [],
  videoUrl = null,
}) {
  // This logic runs on the server to build the initial media list
  const allMedia = (() => {
    const mediaMap = new Map();
    const addMedia = (item, type, alt) => {
      const key = item.id || item.url;
      if (key && !mediaMap.has(key)) {
        mediaMap.set(key, { ...item, type, alt });
      }
    };
    addMedia(mainImage, "image", title);
    gallery.forEach((img, i) =>
      addMedia(img, "image", `${title} - image ${i + 2}`),
    );
    variationsImage.forEach((img) =>
      addMedia(img, "image", `${title} - variation`),
    );
    if (videoUrl) {
      addMedia({ id: videoUrl, url: videoUrl }, "video", `${title} - Video`);
    }
    return Array.from(mediaMap.values());
  })();

  return (
    <div className={styles.galleryContainer}>
      <div className={styles.layoutWrapper}>
        <div className={styles.mainImageContainer}>
          {/* We render the server-passed <Image> component directly */}
          {children}
        </div>

        {/* Render the static, non-interactive thumbnail list */}
        {allMedia.length > 1 && (
          <div className={styles.thumbnailList}>
            {allMedia.map((media, index) => (
              <div
                key={media.id}
                className={`${styles.thumbnailButton} ${
                  index === 0 ? styles.thumbnailActive : ""
                }`}
              >
                {media.type === "video" ? (
                  <div className={styles.videoThumbnail}>
                    <Image
                      src={cloudinaryMainImage(mainImage.name, 60, 60)}
                      alt="Video thumbnail"
                      width={60}
                      height={60}
                      className={styles.thumbnailImage}
                      // priority={true}
                      loading="lazy"
                    />
                    <VideoThumbnailIcon />
                  </div>
                ) : (
                  <Image
                    src={cloudinaryMainImage(media.name, 60, 60)}
                    alt={media.alt}
                    width={60}
                    height={60}
                    className={styles.thumbnailImage}
                    // priority={index < 5} // Prioritize the first image
                    loading="lazy" // Lazy load the rest for performance
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
