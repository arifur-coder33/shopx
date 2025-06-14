'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { cloudinaryMainImage } from '@/utils/cloudinaryUrl';
import useMediaQuery from '@/hooks/useMediaQuery';
import MobileModalZoomer from './MobileModalZoomer';
import styles from './ProductImageGallery.module.css';

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
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [desktopZoomActive, setDesktopZoomActive] = useState(false);
  const [desktopZoomPosition, setDesktopZoomPosition] = useState({ x: 0.5, y: 0.5 });
  const galleryRef = useRef(null); // Ref on the root container now
  
  const activeImage = allImages[activeIndex] || {};

  const handleMouseMove = useCallback(
    (e) => {
      if (!galleryRef.current || isMobile) return;
      // We only care about the main image area for positioning
      const imageRect = galleryRef.current.querySelector(`.${styles.mainImageContainer}`).getBoundingClientRect();
      const galleryRect = galleryRef.current.getBoundingClientRect();

      // Calculate position relative to the image, not the whole gallery
      const x = clamp((e.clientX - imageRect.left) / imageRect.width, 0, 1);
      const y = clamp((e.clientY - imageRect.top) / imageRect.height, 0, 1);
      setDesktopZoomPosition({ x, y });
    },
    [isMobile]
  );

  const openModal = () => {
    if (isMobile) {
      setIsModalOpen(true);
      document.body.style.overflow = 'hidden';
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    document.body.style.overflow = '';
  };
  
  const mainDisplay = React.cloneElement(children, {
    src: cloudinaryMainImage(activeImage.id, 800, 800),
    alt: activeImage.alt,
    priority: activeIndex === 0,
  });

  return (
    // THE ROOT CONTAINER NOW HANDLES POSITIONING AND EVENTS
    <div
      ref={galleryRef}
      className={styles.galleryContainer}
      onMouseEnter={() => !isMobile && setDesktopZoomActive(true)}
      onMouseLeave={() => !isMobile && setDesktopZoomActive(false)}
      onMouseMove={handleMouseMove}
    >
      {/* This inner div is ONLY for layout, not events or positioning */}
      <div className={styles.layoutWrapper}>
        <div 
          className={styles.mainImageContainer}
          onClick={openModal}
          style={{ cursor: isMobile ? 'pointer' : 'crosshair' }}
        >
          {mainDisplay}
          {isMobile && <div className={styles.zoomIconWrapper}><ZoomIcon /></div>}
        </div>

        {allImages.length > 1 && (
          <div className={styles.thumbnailList}>
            {allImages.map((image, index) => (
              <button
                key={image.id || index}
                className={`${styles.thumbnailButton} ${index === activeIndex ? styles.thumbnailActive : ''}`}
                onClick={() => setActiveIndex(index)}
                aria-label={`View image ${index + 1}`}
              >
                <Image
                  src={cloudinaryMainImage(image.id, 100, 100)}
                  alt={image.alt}
                  width={100}
                  height={100}
                  style={{ objectFit: 'cover' }}
                  className={styles.thumbnailImage}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 
        THE ZOOM PANEL IS NOW A SIBLING TO THE LAYOUT WRAPPER.
        It is an overlay and will not affect the width of the main content.
      */}
      {isMounted && !isMobile && (
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