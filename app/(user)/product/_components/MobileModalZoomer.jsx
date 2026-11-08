"use client";

import { useSwipe } from "@/hooks/useSwipe";
import { cloudinaryMainImage, cloudinaryOriginalImage } from "@/utils/cloudinaryUrl";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
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
  initialPreview,
  backgroundColor,
  onClose,
  onIndexChange,
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [openingIndex] = useState(initialIndex);
  const [slideDirection, setSlideDirection] = useState("none");
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [loaded, setLoaded] = useState({});
  const [failed, setFailed] = useState({});

  const imageRef = useRef(null);
  const mouseDrag = useRef(null);
  const lastTouch = useRef({ dist: 0, x: 0, y: 0 }).current;
  const isInteracting = useRef(false);

  const activeMedia = media[currentIndex] || {};
  const isVideoActive = activeMedia.type === "video";
  const original = activeMedia.name ? cloudinaryOriginalImage(activeMedia.name) : null;
  const originalLoaded = loaded[activeMedia.name];
  const preview = (currentIndex === openingIndex && initialPreview) || cloudinaryMainImage(activeMedia.name, 640);

  function zoomBounds(scale = 1) {
    const frame = imageRef.current;
    if (!frame || !originalLoaded || !frame.clientWidth || !frame.clientHeight) {
      return { maxScale: 1, x: 0, y: 0 };
    }
    const { width, height } = originalLoaded;
    const fit = Math.min(1, frame.clientWidth / width, frame.clientHeight / height);
    return {
      maxScale: 1 / fit,
      x: Math.max(0, (width * fit * scale - frame.clientWidth) / 2),
      y: Math.max(0, (height * fit * scale - frame.clientHeight) / 2),
    };
  }

  function panTo(x, y) {
    setTransform((current) => {
      const bounds = zoomBounds(current.scale);
      return { ...current, x: clamp(x, -bounds.x, bounds.x), y: clamp(y, -bounds.y, bounds.y) };
    });
  }

  function toggleZoom() {
    setTransform((current) => ({ x: 0, y: 0, scale: current.scale > 1 ? 1 : zoomBounds().maxScale }));
  }

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  useEffect(() => {
    setTransform({ x: 0, y: 0, scale: 1 });
    onIndexChange?.(currentIndex);
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

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") handleNavigation("next");
      if (event.key === "ArrowLeft") handleNavigation("prev");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleNavigation, onClose]);

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
      if (lastTouch.dist > 0) {
        const ratio = newDist / lastTouch.dist;
        setTransform((current) => {
          const scale = clamp(current.scale * ratio, 1, zoomBounds().maxScale);
          const bounds = zoomBounds(scale);
          return { scale, x: clamp(current.x, -bounds.x, bounds.x), y: clamp(current.y, -bounds.y, bounds.y) };
        });
      }
      lastTouch.dist = newDist;
    }
  };
  const handleTouchEnd = (e) => {
    if (isVideoActive) return;
    swipeHandlers.onTouchEnd(e);
    if (!isInteracting.current) return;
    if (transform.scale > 1 && imageRef.current) {
      panTo(transform.x, transform.y);
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
      <div role="dialog" aria-modal="true" aria-label="Product image gallery" className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
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
          onPointerDown={(event) => {
            if (event.pointerType !== "mouse" || event.button !== 0 || transform.scale <= 1) return;
            event.preventDefault();
            mouseDrag.current = { x: event.clientX - transform.x, y: event.clientY - transform.y };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (mouseDrag.current) panTo(event.clientX - mouseDrag.current.x, event.clientY - mouseDrag.current.y);
          }}
          onLostPointerCapture={() => { mouseDrag.current = null; }}
          style={{ cursor: transform.scale > 1 ? "grab" : undefined }}
        >
          <div className={styles.imageTransitionContainer}>
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
                {original && <>
                  {!originalLoaded && <img src={preview} alt="" className={styles.viewerImage} />}
                  <img
                    src={original}
                    alt={activeMedia.alt}
                    decoding="async"
                    fetchPriority="high"
                    className={styles.viewerImage}
                    style={{ opacity: originalLoaded ? 1 : 0 }}
                    draggable={false}
                    onLoad={({ currentTarget }) => {
                      const { naturalWidth: width, naturalHeight: height } = currentTarget;
                      setLoaded((previous) => ({ ...previous, [activeMedia.name]: { width, height } }));
                    }}
                    onError={() => setFailed((previous) => ({ ...previous, [activeMedia.name]: true }))}
                  />
                </>}
              </div>
            )}
          </div>
        </div>
        <div className={styles.viewerControls}>
          <button type="button" aria-label="Previous image" onClick={() => handleNavigation("prev")} disabled={media.length < 2 || transform.scale > 1}><ChevronLeft /></button>
          <span>{currentIndex + 1} / {media.length}</span>
          {original && <button type="button" aria-label={transform.scale > 1 ? "Fit image to screen" : "Zoom to original size"} disabled={!originalLoaded} onClick={toggleZoom}>
            {transform.scale > 1 ? <ZoomOut aria-hidden="true" /> : <ZoomIn aria-hidden="true" />}
          </button>}
          {failed[activeMedia.name] && <span>Original image unavailable</span>}
          <button type="button" aria-label="Next image" onClick={() => handleNavigation("next")} disabled={media.length < 2 || transform.scale > 1}><ChevronRight /></button>
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
