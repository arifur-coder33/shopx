"use client";

import { useSwipe } from "@/hooks/useSwipe";
import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
import Image from "next/image";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./ProductImageGallery.module.css";
import VideoPlayer from "./VideoPlayer"; // Import the new component

const clamp = (val, min, max) => Math.max(min, Math.min(val, max));

// --- Icons ---
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

export default React.memo(function MobileModalZoomer({
  media,
  initialIndex,
  backgroundColor,
  onClose,
  onIndexChange,
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [slideDirection, setSlideDirection] = useState("none");
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [loadedMedia, setLoadedMedia] = useState({ [initialIndex]: true });

  const imageRef = useRef(null);
  const lastTouch = useRef({ dist: 0, x: 0, y: 0 }).current;
  const isInteracting = useRef(false);

  const activeMedia = media[currentIndex] || {};
  const isVideoActive = activeMedia.type === "video";
  const isCurrentMediaLoaded = loadedMedia[currentIndex] || isVideoActive;

  useEffect(() => {
    const preload = (index) => {
      if (index < 0 || index >= media.length || loadedMedia[index]) return;
      if (media[index]?.type === "image") {
        const img = new window.Image();
        img.src = cloudinaryMainImage(media[index].name, 1200, 1200);
        img.onload = () =>
          setLoadedMedia((prev) => ({ ...prev, [index]: true }));
      }
    };
    preload(currentIndex + 1);
    preload(currentIndex - 1);
  }, [currentIndex, media, loadedMedia]);

  useEffect(() => {
    setTransform({ x: 0, y: 0, scale: 1 });
    onIndexChange(currentIndex);
  }, [currentIndex, onIndexChange]);

  const handleNavigation = useCallback(
    (direction) => {
      if (transform.scale > 1) return;
      setSlideDirection(direction);
      const newIndex =
        (direction === "next"
          ? currentIndex + 1
          : currentIndex - 1 + media.length) % media.length;
      setCurrentIndex(newIndex);
    },
    [currentIndex, media.length, transform.scale]
  );

  const swipeHandlers = useSwipe({
    onSwipeLeft: () => handleNavigation("next"),
    onSwipeRight: () => handleNavigation("prev"),
    enabled: transform.scale === 1 && !isVideoActive,
  });

  const handleTouchStart = (e) => {
    if (isVideoActive) return;
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
    if (isVideoActive || !isInteracting.current) return;
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
    if (isVideoActive) return;
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
          aria-label="Close media view"
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
          {!isCurrentMediaLoaded && !isVideoActive && (
            <div className={styles.spinnerContainer}>
              <SpinnerIcon />
            </div>
          )}
          <div
            className={styles.imageTransitionContainer}
            style={{ opacity: isCurrentMediaLoaded ? 1 : 0 }}
          >
            {isVideoActive ? (
              <VideoPlayer
                url={activeMedia.url}
                alt={activeMedia.alt}
                isMuted={false}
              />
            ) : (
              <div
                key={currentIndex}
                className={`${styles.imageAnimationWrapper} ${animationClass}`}
                onAnimationEnd={() => setSlideDirection("none")}
                style={{
                  transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                }}
              >
                {activeMedia.id && (
                  <Image
                    src={cloudinaryMainImage(activeMedia.name, 1200, 1200)}
                    alt={activeMedia.alt}
                    fill={true}
                    sizes="100vw"
                    priority={true}
                    style={{ objectFit: "contain" }}
                  />
                )}
              </div>
            )}
          </div>
        </div>
        <div className={styles.modalThumbnailList}>
          {media.map((item, index) => (
            <button
              key={item.id || index}
              className={`${styles.thumbnailButton} ${
                index === currentIndex ? styles.thumbnailActive : ""
              }`}
              onClick={() => setCurrentIndex(index)}
            >
              {item.type === "video" ? (
                <div className={styles.videoThumbnail}>
                  <Image
                    src={cloudinaryMainImage(
                      media.find((m) => m.type === "image")?.name || "",
                      60,
                      60
                    )}
                    alt="Video thumbnail"
                    width={60}
                    height={60}
                    style={{ objectFit: "cover" }}
                    className={styles.thumbnailImage}
                  />
                  <VideoThumbnailIcon />
                </div>
              ) : (
                <Image
                  src={cloudinaryMainImage(item.name, 60, 60)}
                  alt={item.alt}
                  width={60}
                  height={60}
                  style={{ objectFit: "cover" }}
                  className={styles.thumbnailImage}
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
});
