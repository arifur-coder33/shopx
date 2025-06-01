// components/ImageMagnifier.js
'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import styles from './ImageMagnifier.module.css';
import useMediaQuery from '@/hooks/useMediaQuery'; // Adjust path if needed

const ImageMagnifier = ({
  smallImageSrc,
  smallImageAlt = "Product Image",
  smallImageWidth,
  smallImageHeight,
  largeImageSrc,
  largeImageWidth,
  largeImageHeight,
  magnifiedImageContainerWidth = 300,
  magnifiedImageContainerHeight = 300,
  zoomFactor, // Overall zoom level
  magnifierOffset = { x: 15, y: 0 }, // Desktop: offset of magnified view from small image
  glassMagnifierSize = 150, // Mobile: diameter of the circular glass magnifier
  hideLensOnMobile = false, // If true, the small square lens won't show on mobile, only the glass
}) => {
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 }); // Raw cursor/touch position on small image
  
  const smallImageRef = useRef(null);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const actualZoomFactor = zoomFactor || (largeImageWidth / smallImageWidth);

  // Lens dimensions (the small square guide on desktop, or the glass on mobile)
  let currentLensWidth, currentLensHeight;
  if (isMobile) {
    currentLensWidth = glassMagnifierSize;
    currentLensHeight = glassMagnifierSize;
  } else {
    // Desktop lens size is derived from the magnified container and zoom factor
    currentLensWidth = magnifiedImageContainerWidth / actualZoomFactor;
    currentLensHeight = magnifiedImageContainerHeight / actualZoomFactor;
  }

  // Top-left position of the lens/glass
  const lensDisplayX = cursorPosition.x - currentLensWidth / 2;
  const lensDisplayY = cursorPosition.y - currentLensHeight / 2;

  // Constrained top-left position of the lens/glass (used for background calculation)
  const constrainedLensX = Math.max(0, Math.min(lensDisplayX, smallImageWidth - currentLensWidth));
  const constrainedLensY = Math.max(0, Math.min(lensDisplayY, smallImageHeight - currentLensHeight));

  // Background position for the magnified content
  // This is the offset of the large image.
  const backgroundPosX = -constrainedLensX * actualZoomFactor;
  const backgroundPosY = -constrainedLensY * actualZoomFactor;


  const calculatePositions = useCallback((clientX, clientY) => {
    if (!smallImageRef.current) return;
    const rect = smallImageRef.current.getBoundingClientRect();
    
    // Cursor position relative to the small image
    const x = Math.max(0, Math.min(clientX - rect.left, smallImageWidth));
    const y = Math.max(0, Math.min(clientY - rect.top, smallImageHeight));
    
    setCursorPosition({ x, y });

  }, [smallImageRef, smallImageWidth, smallImageHeight]);

  const handleMouseEnter = (e) => {
    if (isMobile) return;
    setShowMagnifier(true);
    calculatePositions(e.clientX, e.clientY);
  };

  const handleMouseMove = (e) => {
    if (isMobile || !showMagnifier) return;
    calculatePositions(e.clientX, e.clientY);
  };

  const handleMouseLeave = () => {
    if (isMobile) return;
    setShowMagnifier(false);
  };

  const handleTouchStart = (e) => {
    if (!isMobile) return;
    // e.preventDefault(); // Only preventDefault if touchMove will also, to allow tap-to-click if desired
    setShowMagnifier(true);
    calculatePositions(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    if (!isMobile || !showMagnifier) return;
    e.preventDefault(); // Prevent page scroll while magnifying
    calculatePositions(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!isMobile) return;
    setShowMagnifier(false);
  };
  
  const commonLensStyle = {
    width: `${currentLensWidth}px`,
    height: `${currentLensHeight}px`,
    // Position the lens centered on the cursor/touch, but allow it to go slightly off-image
    // for a more natural feel, especially for the glass magnifier edge.
    // The actual image sampling is done using `constrainedLensX/Y`.
    top: `${cursorPosition.y - currentLensHeight / 2}px`,
    left: `${cursorPosition.x - currentLensWidth / 2}px`,
  };

  return (
    <div className={styles.magnifierContainer} style={{ width: smallImageWidth }}>
      <div
        className={styles.smallImageWrapper}
        ref={smallImageRef}
        style={{ width: smallImageWidth, height: smallImageHeight }}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <Image
          src={smallImageSrc}
          alt={smallImageAlt}
          width={smallImageWidth}
          height={smallImageHeight}
          priority
          draggable="false"
          style={{ touchAction: isMobile ? 'none' : 'auto' }} // Prevent pan/zoom on image itself on mobile
        />

        {/* Desktop Lens (semi-transparent square) */}
        {showMagnifier && !isMobile && (
          <div
            className={styles.desktopLens}
            style={{
              ...commonLensStyle,
              // Override top/left to use constrained values for desktop lens to keep it within image
              top: `${constrainedLensY}px`,
              left: `${constrainedLensX}px`,
            }}
          />
        )}

        {/* Mobile Glass Magnifier */}
        {showMagnifier && isMobile && (
          <div
            className={styles.mobileGlassMagnifier}
            style={{
              ...commonLensStyle,
              backgroundImage: `url(${largeImageSrc || smallImageSrc})`,
              backgroundSize: `${largeImageWidth}px ${largeImageHeight}px`,
              backgroundPosition: `${backgroundPosX}px ${backgroundPosY}px`,
            }}
          />
        )}
      </div>

      {/* Desktop Magnified Image Container (Side Panel) */}
      {showMagnifier && !isMobile && (
        <div
          className={styles.desktopMagnifiedImageContainer}
          style={{
            width: `${magnifiedImageContainerWidth}px`,
            height: `${magnifiedImageContainerHeight}px`,
            backgroundImage: `url(${largeImageSrc || smallImageSrc})`,
            backgroundSize: `${largeImageWidth}px ${largeImageHeight}px`,
            backgroundPosition: `${backgroundPosX}px ${backgroundPosY}px`,
            top: `${magnifierOffset.y}px`,
            left: `${smallImageWidth + magnifierOffset.x}px`,
          }}
        />
      )}
    </div>
  );
};

export default ImageMagnifier;