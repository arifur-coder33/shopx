// file: app/product/_components/InteractiveGallery.js
"use client";

import useMediaQuery from "@/hooks/useMediaQuery";
import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const MobileModalZoomer = dynamic(() => import("./MobileModalZoomer"), {
  loading: () => (
    <div className={styles.spinnerContainer}>
      <p>Loading Zoom...</p>
    </div>
  ),
});

import styles from "./ProductImageGallery.module.css";
const VideoPlayer = dynamic(() => import("./VideoPlayer"), {
  loading: () => (
    <div className={styles.spinnerContainer}>
      <p>Loading Player...</p>
    </div>
  ),
});

const ZoomIcon = () => (
  <svg className={styles.iconSvg} viewBox="0 0 24 24">
    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zM10 9h-1V6h2v3h3v2h-3v3H9v-3H6V9h3z" />
  </svg>
);

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

export default function ProductImageGallery({
  children,
  mainImage,
  gallery = [],
  title,
  variationsImage = [],
  activeImageId = null,
  videoUrl = "https://www.youtube.com/watch?v=KvdBePTOmc4",
}) {
  const allMedia = useMemo(() => {
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
  }, [mainImage, gallery, variationsImage, title, videoUrl]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setIsFading(true);
    const timer = setTimeout(() => setIsFading(false), 150);
    return () => clearTimeout(timer);
  }, [activeIndex]);

  useEffect(() => {
    if (activeImageId) {
      const newIndex = allMedia.findIndex(
        (media) => media.id === activeImageId,
      );
      if (newIndex !== -1 && newIndex !== activeIndex) {
        setActiveIndex(newIndex);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeImageId]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [loadVideoPlayer, setLoadVideoPlayer] = useState(false);
  const activeMedia = allMedia[activeIndex] || {};
  const isVideoActive = activeMedia.type === "video";

  const handleThumbnailClick = (index) => {
    if (allMedia[index].type === "video") {
      setLoadVideoPlayer(true);
    }
    setActiveIndex(index);
  };

  const openModal = () => {
    if (isMobile) {
      setIsModalOpen(true);
      document.body.style.overflow = "hidden";
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    document.body.style.overflow = "";
  };

  const [desktopZoomActive, setDesktopZoomActive] = useState(false);
  const [desktopZoomPosition, setDesktopZoomPosition] = useState({
    x: 0.5,
    y: 0.5,
  });
  const galleryRef = useRef(null);

  const ZOOM_LEVEL = 2;
  const lensSize = useMemo(
    () => ({
      width: (1 / ZOOM_LEVEL) * 100,
      height: (1 / ZOOM_LEVEL) * 100,
    }),
    [],
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (!galleryRef.current || isMobile || isVideoActive) return;
      const imageRect = galleryRef.current
        .querySelector(`.${styles.mainImageContainer}`)
        .getBoundingClientRect();
      const x = Math.max(
        0,
        Math.min((e.clientX - imageRect.left) / imageRect.width, 1),
      );
      const y = Math.max(
        0,
        Math.min((e.clientY - imageRect.top) / imageRect.height, 1),
      );
      setDesktopZoomPosition({ x, y });
    },
    [isMobile, isVideoActive],
  );

  const lensPosition = useMemo(() => {
    const left = desktopZoomPosition.x * 100 - lensSize.width / 2;
    const top = desktopZoomPosition.y * 100 - lensSize.height / 2;
    return {
      left: Math.max(0, Math.min(left, 100 - lensSize.width)),
      top: Math.max(0, Math.min(top, 100 - lensSize.height)),
    };
  }, [desktopZoomPosition, lensSize]);

  // --- START: THE FIX ---
  // This new calculation correctly positions the background in the zoom panel.
  // It maps the lens's position (which moves in a smaller range) to the
  // full 0-100% range required for the background image.
  const zoomPanelPosition = useMemo(() => {
    const x = (lensPosition.left / (100 - lensSize.width)) * 100;
    const y = (lensPosition.top / (100 - lensSize.height)) * 100;

    // A check to prevent NaN if lens size is 100%
    return {
      x: isFinite(x) ? x : 0,
      y: isFinite(y) ? y : 0,
    };
  }, [lensPosition, lensSize]);
  // --- END: THE FIX ---

  return (
    <div
      ref={galleryRef}
      className={styles.galleryContainer}
      onMouseMove={handleMouseMove}
    >
      <div className={styles.layoutWrapper}>
        <div
          className={styles.mainImageContainer}
          onMouseEnter={() =>
            !isMobile && !isVideoActive && setDesktopZoomActive(true)
          }
          onMouseLeave={() => !isMobile && setDesktopZoomActive(false)}
          onClick={openModal}
        >
          <div
            className={`${styles.transitionContainer} ${
              isFading ? styles.fading : ""
            }`}
          >
            {isVideoActive && !isModalOpen ? (
              loadVideoPlayer ? (
                <VideoPlayer
                  url={activeMedia.url}
                  alt={activeMedia.alt}
                  isMuted={true}
                />
              ) : (
                <div className={styles.videoThumbnail}>
                  <Image
                    src={cloudinaryMainImage(mainImage.name, 600, 600)}
                    alt="Video thumbnail"
                    priority
                    fill
                    style={{ objectFit: "cover" }}
                  />
                  <div className={styles.largePlayButtonOverlay}></div>
                </div>
              )
            ) : (
              // React.cloneElement(children, {
              //   src: cloudinaryMainImage(activeMedia?.name, 800, 800),
              //   alt: activeMedia.alt,
              //   priority: activeIndex === 0,
              // })
              <Image
                src={cloudinaryMainImage(activeMedia?.name, 600, 600)}
                alt={activeMedia.alt}
                priority={activeIndex === 0}
                fill
                style={{ objectFit: "cover" }}
              />
            )}
          </div>
          {isMobile && !isVideoActive && (
            <div className={styles.zoomIconWrapper}>
              <ZoomIcon />
            </div>
          )}

          <div
            className={styles.zoomLens}
            style={{
              opacity: desktopZoomActive && !isMobile && !isVideoActive ? 1 : 0,
              visibility:
                desktopZoomActive && !isMobile && !isVideoActive
                  ? "visible"
                  : "hidden",
              width: `${lensSize.width}%`,
              height: `${lensSize.height}%`,
              top: `${lensPosition.top}%`,
              left: `${lensPosition.left}%`,
            }}
          />
        </div>
        {allMedia.length > 1 && (
          <div className={styles.thumbnailList}>
            {allMedia.map((media, index) => (
              <button
                key={media.id}
                className={`${styles.thumbnailButton} ${
                  index === activeIndex ? styles.thumbnailActive : ""
                }`}
                onClick={() => handleThumbnailClick(index)}
              >
                {media.type === "video" ? (
                  <div className={styles.videoThumbnail}>
                    <Image
                      src={cloudinaryMainImage(mainImage.name, 60, 60)}
                      alt="Video thumbnail"
                      width={60}
                      height={60}
                      className={styles.thumbnailImage}
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
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      <div
        className={styles.desktopZoomPanel}
        style={{
          backgroundImage: `url(${cloudinaryMainImage(
            activeMedia.name,
            1800,
            1800,
          )})`,
          backgroundSize: `${ZOOM_LEVEL * 100}%`,
          // --- START: THE FIX ---
          // Use the new, corrected position calculation here.
          backgroundPosition: `${zoomPanelPosition.x}% ${zoomPanelPosition.y}%`,
          // --- END: THE FIX ---
          opacity: !isVideoActive && desktopZoomActive ? 1 : 0,
          visibility:
            !isVideoActive && desktopZoomActive ? "visible" : "hidden",
        }}
      />
      {isMobile && isModalOpen && (
        <MobileModalZoomer
          media={allMedia}
          initialIndex={activeIndex}
          onClose={closeModal}
          onIndexChange={setActiveIndex}
          backgroundColor="rgba(0, 0, 0, 0.9)"
        />
      )}
    </div>
  );
}
