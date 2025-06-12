// components/ImageZoomer.js
'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Imagecustom from '@/components/images/ImageCustom';
import { cloudinaryMainImage } from '@/utils/cloudinaryUrl';
import styles from './ImageZoomer.module.css';
import useMediaQuery from '@/hooks/useMediaQuery';

const clamp = (val, min, max) => Math.max(min, Math.min(val, max));

const ZoomIcon = () => (<svg className={styles.iconSvg} viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zM10 9h-1V6h2v3h3v2h-3v3H9v-3H6V9h3z"/></svg>);
const CloseIcon = () => (<svg className={styles.iconSvg} viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>);
const SpinnerIcon = () => (<svg className={styles.spinnerSvg} viewBox="0 0 50 50"><circle cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle></svg>);

const ImageZoomer = ({
  images = [],
  aspectRatio = "1/1",
  overlayBackgroundColor = "rgba(0, 0, 0, 0.9)",
  zoomIcon = true,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [desktopZoomActive, setDesktopZoomActive] = useState(false);
  const [desktopZoomPosition, setDesktopZoomPosition] = useState({ x: 0.5, y: 0.5 });

  const isMobile = useMediaQuery('(max-width: 768px)');
  const imageContainerRef = useRef(null);
  const activeImage = images[activeIndex] || {};

  const handleMouseMove = (e) => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((e.clientY - rect.top) / rect.height, 0, 1);
    setDesktopZoomPosition({ x, y });
  };

  const handleOpenModal = () => { if (isMobile) { setIsModalOpen(true); document.body.style.overflow = 'hidden'; }};
  const handleCloseModal = useCallback(() => { setIsModalOpen(false); document.body.style.overflow = ''; }, []);

  if (!images.length) return <div>No images provided.</div>;

  return (
    <div className={styles.galleryContainer}>
      <div
        className={styles.zoomerRootContainer}
        ref={imageContainerRef}
        onMouseEnter={() => !isMobile && setDesktopZoomActive(true)}
        onMouseLeave={() => !isMobile && setDesktopZoomActive(false)}
        onMouseMove={!isMobile ? handleMouseMove : undefined}
      >
        <div className={styles.smallImageContainer} onClick={handleOpenModal} style={{ aspectRatio }}>
          {activeImage.id && (
            <Imagecustom
              key={activeImage.id}
              src={activeImage.id}
              alt={activeImage.alt}
              fill={true}
              urlWidthHint={600} // Provide a sensible base width for the main image URL
              objectFit="contain"
              priority={true}
            />
          )}
          {isMobile && zoomIcon && <div className={styles.zoomIconWrapper}><ZoomIcon /></div>}
        </div>
        {!isMobile && (
          <div
            className={styles.desktopZoomPanel}
            style={{
              backgroundImage: `url(${cloudinaryMainImage(activeImage.id, 1800, 1800)})`,
              backgroundPosition: `${desktopZoomPosition.x * 100}% ${desktopZoomPosition.y * 100}%`,
              opacity: desktopZoomActive ? 1 : 0,
              visibility: desktopZoomActive ? 'visible' : 'hidden',
            }}
          />
        )}
      </div>
      
      <div className={styles.thumbnailList}>
        {images.map((image, index) => (
          <button key={image.id || index} className={`${styles.thumbnailButton} ${index === activeIndex ? styles.thumbnailActive : ''}`} onClick={() => setActiveIndex(index)}>
            <Imagecustom
              src={image.id}
              alt={image.alt}
              w={100} // This is not using fill, so `w` provides the hint correctly
              h={100}
              objectFit="cover"
            />
          </button>
        ))}
      </div>
      
      {isModalOpen && (
        <MobileModalZoomer
          images={images}
          initialIndex={activeIndex}
          onClose={handleCloseModal}
          backgroundColor={overlayBackgroundColor}
          onIndexChange={setActiveIndex}
        />
      )}
    </div>
  );
};

const MobileModalZoomer = ({ images, initialIndex, backgroundColor, onClose, onIndexChange }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [loadedImages, setLoadedImages] = useState({ [initialIndex]: true });
  const imageRef = useRef(null);
  const lastTouch = useRef({ dist: 0, x: 0, y: 0, time: 0 }).current;
  const isInteracting = useRef(false);
  const activeImage = images[currentIndex] || {};
  const isCurrentImageLoaded = loadedImages[currentIndex];

  useEffect(() => {
    const preload = (index) => {
      if (index < 0 || index >= images.length || loadedImages[index]) return;
      const img = new window.Image();
      img.src = cloudinaryMainImage(images[index].id, 1800, 1800);
      img.onload = () => setLoadedImages(prev => ({ ...prev, [index]: true }));
    };
    preload(currentIndex);
    preload(currentIndex + 1);
    preload(currentIndex - 1);
  }, [currentIndex, images, loadedImages]);

  useEffect(() => {
    setTransform({ x: 0, y: 0, scale: 1 });
    onIndexChange(currentIndex);
  }, [currentIndex, onIndexChange]);

  const handleNext = useCallback(() => { setCurrentIndex((prev) => (prev + 1) % images.length); }, [images.length]);
  const handlePrev = useCallback(() => { setCurrentIndex((prev) => (prev - 1 + images.length) % images.length); }, [images.length]);

  const handleTouchStart = (e) => {
    isInteracting.current = true;
    lastTouch.time = Date.now();
    if (transform.scale === 1) {
      lastTouch.x = e.touches[0].pageX;
      lastTouch.y = e.touches[0].pageY;
    } else if (e.touches.length === 1) {
      lastTouch.x = e.touches[0].pageX - transform.x;
      lastTouch.y = e.touches[0].pageY - transform.y;
    } else if (e.touches.length === 2) {
      lastTouch.dist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
    }
  };

  const handleTouchMove = (e) => {
    if (!isInteracting.current) return;
    e.preventDefault();
    if (e.touches.length === 1 && transform.scale > 1) {
      const x = e.touches[0].pageX - lastTouch.x;
      const y = e.touches[0].pageY - lastTouch.y;
      setTransform(t => ({ ...t, x, y }));
    } else if (e.touches.length === 2) {
      const newDist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
      const scale = clamp(transform.scale * (newDist / lastTouch.dist), 1, 5);
      setTransform(t => ({ ...t, scale }));
      lastTouch.dist = newDist;
    }
  };

  const handleTouchEnd = (e) => {
    if (!isInteracting.current) return;
    if (transform.scale === 1 && e.changedTouches.length === 1 && (Date.now() - lastTouch.time < 300)) {
      const deltaX = e.changedTouches[0].pageX - lastTouch.x;
      if (deltaX > 50) handlePrev();
      else if (deltaX < -50) handleNext();
    }
    if (transform.scale > 1) {
        const { width, height } = imageRef.current.getBoundingClientRect();
        const maxPanX = Math.max(0, (width * transform.scale - width) / 2);
        const maxPanY = Math.max(0, (height * transform.scale - height) / 2);
        setTransform(t => ({...t, x: clamp(t.x, -maxPanX, maxPanX), y: clamp(t.y, -maxPanY, maxPanY) }));
    }
    isInteracting.current = false;
  };

  return createPortal(
    <div className={styles.modalBackdrop} style={{ backgroundColor }}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close image zoom"><CloseIcon /></button>
        <div className={styles.modalImageWrapper} ref={imageRef} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
          {!isCurrentImageLoaded && <div className={styles.spinnerContainer}><SpinnerIcon/></div>}
          <div className={styles.imageTransitionContainer} style={{ opacity: isCurrentImageLoaded ? 1 : 0 }}>
            {activeImage.id && (
              <Imagecustom
                key={activeImage.id}
                src={activeImage.id}
                alt={activeImage.alt}
                fill={true}
                urlWidthHint={1800} // Provide a high-res width for the zoomable modal image URL
                objectFit="contain"
                imageClassName={styles.modalImageActual}
                style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}
              />
            )}
          </div>
        </div>
        <div className={styles.modalThumbnailList}>
          {images.map((image, index) => (
            <button key={image.id || index} className={`${styles.thumbnailButton} ${index === currentIndex ? styles.thumbnailActive : ''}`} onClick={() => setCurrentIndex(index)}>
              <Imagecustom
                src={image.id}
                alt={image.alt}
                w={60} // Not using fill, `w` works correctly
                h={60}
                objectFit="cover"
              />
            </button>
          ))}
        </div>
      </div>
    </div>, document.body
  );
};

export default ImageZoomer;