"use client";

import useMediaQuery from "@/hooks/useMediaQuery";
import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
import Image from "next/image";
import React, { useCallback, useRef, useState } from "react";
import MobileModalZoomer from "./MobileModalZoomer";
import styles from "./ProductImageGallery.module.css";

const clamp = (val, min, max) => Math.max(min, Math.min(val, max));
const ZoomIcon = () => (
  <svg className={styles.iconSvg} viewBox="0 0 24 24">
    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zM10 9h-1V6h2v3h3v2h-3v3H9v-3H6V9h3z" />
  </svg>
);

export default function ProductImageGallery({
  children,
  mainImageId,
  galleryIds = [],
  title,
}) {
  const allImages = [
    { id: mainImageId, alt: title },
    ...galleryIds
      .filter((id) => id && id !== mainImageId)
      .map((id, index) => ({ id, alt: `${title} - image ${index + 2}` })),
  ];

  const [activeIndex, setActiveIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [isLoading, setIsLoading] = useState(true);
  const [desktopZoomActive, setDesktopZoomActive] = useState(false);
  const [desktopZoomPosition, setDesktopZoomPosition] = useState({
    x: 0.5,
    y: 0.5,
  });
  const imageContainerRef = useRef(null);

  const activeImage = allImages[activeIndex] || {};

  const handleMouseMove = useCallback(
    (e) => {
      if (!imageContainerRef.current || isMobile) return;
      const rect = imageContainerRef.current.getBoundingClientRect();
      const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
      const y = clamp((e.clientY - rect.top) / rect.height, 0, 1);
      setDesktopZoomPosition({ x, y });
    },
    [isMobile]
  );

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

  const mainDisplay = React.cloneElement(children, {
    src: cloudinaryMainImage(activeImage.id, 600, 600),
    alt: activeImage.alt,
    priority: activeIndex === 0,
    onLoad: () => setIsLoading(false),
    className: `${styles.mainImage} ${
      isLoading ? styles.imageLoading : styles.imageLoaded
    }`,
  });

  return (
    <div className={styles.galleryContainer}>
      {/* --- NEW WRAPPER for image and zoom panel --- */}
      <div
        ref={imageContainerRef}
        className={styles.imageAndZoomWrapper}
        onMouseEnter={() => !isMobile && setDesktopZoomActive(true)}
        onMouseLeave={() => !isMobile && setDesktopZoomActive(false)}
        onMouseMove={handleMouseMove}
      >
        {/* Main image container now only handles the image itself */}
        <div
          className={styles.mainImageContainer}
          onClick={openModal}
          style={{ cursor: isMobile ? "pointer" : "crosshair" }}
        >
          {mainDisplay}
          {isMobile && (
            <div className={styles.zoomIconWrapper}>
              <ZoomIcon />
            </div>
          )}
        </div>

        {/* --- DESKTOP ZOOM PANEL IS NOW A SIBLING --- */}
        {!isMobile && (
          <div
            className={styles.desktopZoomPanel}
            style={{
              backgroundImage: `url(${cloudinaryMainImage(
                activeImage.id,
                1200,
                1200
              )})`,
              backgroundPosition: `${desktopZoomPosition.x * 100}% ${
                desktopZoomPosition.y * 100
              }%`,
              opacity: desktopZoomActive ? 1 : 0,
              visibility: desktopZoomActive ? "visible" : "hidden",
            }}
          />
        )}
      </div>

      {/* Thumbnails remain outside the wrapper */}
      {allImages.length > 1 && (
        <div className={styles.thumbnailList}>
          {allImages.map((image, index) => (
            <button
              key={image.id || index}
              className={`${styles.thumbnailButton} ${
                index === activeIndex ? styles.thumbnailActive : ""
              }`}
              onClick={() => setActiveIndex(index)}
              aria-label={`View image ${index + 1}`}
            >
              <Image
                src={cloudinaryMainImage(image.id, 100, 100)}
                alt={image.alt}
                width={100}
                height={100}
                style={{ objectFit: "cover" }}
                className={styles.thumbnailImage}
              />
            </button>
          ))}
        </div>
      )}

      {isMobile && isModalOpen && (
        <MobileModalZoomer
          images={allImages}
          initialIndex={activeIndex}
          onClose={closeModal}
          backgroundColor="rgba(0, 0, 0, 0.9)"
          onIndexChange={setActiveIndex}
        />
      )}
    </div>
  );
}
