"use client";

import { useSwipe } from "@/hooks/useSwipe";
import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./ProductImageGallery.module.css";

const clamp = (val, min, max) => Math.max(min, Math.min(val, max));

const CloseIcon = () => (
  <svg className={styles.iconSvg} viewBox="0 0 24 24">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
  </svg>
);
const SpinnerIcon = () => (
  <svg className={styles.spinnerSvg} viewBox="0 0 50 50">
    <circle cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
  </svg>
);

export default function MobileModalZoomer({
  images,
  initialIndex,
  backgroundColor,
  onClose,
  onIndexChange,
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [slideDirection, setSlideDirection] = useState("none");
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [loadedImages, setLoadedImages] = useState({ [initialIndex]: true });

  const imageRef = useRef(null);
  const lastTouch = useRef({ dist: 0, x: 0, y: 0 }).current;
  const isInteracting = useRef(false);
  const activeImage = images[currentIndex] || {};
  const isCurrentImageLoaded = loadedImages[currentIndex];

  useEffect(() => {
    const preload = (index) => {
      if (index < 0 || index >= images.length || loadedImages[index]) return;
      const img = new window.Image();
      img.src = cloudinaryMainImage(images[index].id, 1200, 1200);
      img.onload = () =>
        setLoadedImages((prev) => ({ ...prev, [index]: true }));
    };
    preload(currentIndex);
    preload(currentIndex + 1);
    preload(currentIndex - 1);
  }, [currentIndex, images, loadedImages]);

  useEffect(() => {
    setTransform({ x: 0, y: 0, scale: 1 });
    onIndexChange(currentIndex);
  }, [currentIndex, onIndexChange]);

  const handleNavigation = useCallback(
    (direction) => {
      if (transform.scale > 1) return;
      setSlideDirection(direction);
      const newIndex =
        direction === "next"
          ? (currentIndex + 1) % images.length
          : (currentIndex - 1 + images.length) % images.length;
      setCurrentIndex(newIndex);
    },
    [currentIndex, images.length, transform.scale]
  );

  const swipeHandlers = useSwipe({
    onSwipeLeft: () => handleNavigation("next"),
    onSwipeRight: () => handleNavigation("prev"),
    enabled: transform.scale === 1,
  });

  const handleTouchStart = (e) => {
    swipeHandlers.onTouchStart(e);
    isInteracting.current = true;
    if (e.touches.length === 2) {
      lastTouch.dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
    } else if (e.touches.length === 1) {
      lastTouch.x =
        e.touches[0].pageX - (transform.scale > 1 ? transform.x : 0);
      lastTouch.y =
        e.touches[0].pageY - (transform.scale > 1 ? transform.y : 0);
    }
  };
  const handleTouchMove = (e) => {
    if (!isInteracting.current) return;
    if (e.touches.length === 1 && transform.scale > 1) {
      e.preventDefault();
      const x = e.touches[0].pageX - lastTouch.x;
      const y = e.touches[0].pageY - lastTouch.y;
      setTransform((t) => ({ ...t, x, y }));
    } else if (e.touches.length === 2) {
      e.preventDefault();
      const newDist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      const scale = clamp(transform.scale * (newDist / lastTouch.dist), 1, 5);
      setTransform((t) => ({ ...t, scale }));
      lastTouch.dist = newDist;
    }
  };
  const handleTouchEnd = (e) => {
    swipeHandlers.onTouchEnd(e);
    if (!isInteracting.current) return;
    if (transform.scale > 1 && imageRef.current) {
      const { width, height } = imageRef.current.getBoundingClientRect();
      const maxPanX = Math.max(0, (width * transform.scale - width) / 2);
      const maxPanY = Math.max(0, (height * transform.scale - height) / 2);
      setTransform((t) => ({
        ...t,
        x: clamp(t.x, -maxPanX, maxPanX),
        y: clamp(t.y, -maxPanY, maxPanY),
      }));
    }
    isInteracting.current = false;
  };

  const animationClass =
    slideDirection === "next"
      ? styles.slideNext
      : slideDirection === "prev"
      ? styles.slidePrev
      : "";

  return createPortal(
    <div
      className={styles.modalBackdrop}
      style={{ backgroundColor }}
      onClick={onClose}
    >
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close image zoom"
        >
          <CloseIcon />
        </button>
        <div
          className={styles.modalImageWrapper}
          ref={imageRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {!isCurrentImageLoaded && (
            <div className={styles.spinnerContainer}>
              <SpinnerIcon />
            </div>
          )}
          <div
            className={styles.imageTransitionContainer}
            style={{ opacity: isCurrentImageLoaded ? 1 : 0 }}
          >
            <div
              key={currentIndex}
              className={`${styles.imageAnimationWrapper} ${animationClass}`}
              onAnimationEnd={() => setSlideDirection("none")}
              style={{
                transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              }}
            >
              {activeImage.id && (
                <Image
                  src={cloudinaryMainImage(activeImage.id, 1800, 1800)}
                  alt={activeImage.alt}
                  fill={true}
                  sizes="100vw"
                  priority={true} // Priority inside modal to load fast
                  style={{ objectFit: "contain" }}
                />
              )}
            </div>
          </div>
        </div>
        <div className={styles.modalThumbnailList}>
          {images.map((image, index) => (
            <button
              key={image.id || index}
              className={`${styles.thumbnailButton} ${
                index === currentIndex ? styles.thumbnailActive : ""
              }`}
              onClick={() => setCurrentIndex(index)}
            >
              <Image
                src={cloudinaryMainImage(image.id, 60, 60)}
                alt={image.alt}
                width={60}
                height={60}
                style={{ objectFit: "cover" }}
                className={styles.thumbnailImage}
              />
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
