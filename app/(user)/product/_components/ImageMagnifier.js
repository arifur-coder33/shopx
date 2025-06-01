// components/ImageMagnifier.js
'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import styles from './ImageMagnifier.module.css';
import useMediaQuery from '@/hooks/useMediaQuery'; 

const ImageMagnifier = ({
  smallImageSrc,
  smallImageAlt = "Product Image",
  smallImageWidth,
  smallImageHeight,
  largeImageSrc,
  largeImageWidth,
  largeImageHeight,
  magnifiedImageContainerWidth = 300, // Default for desktop
  magnifiedImageContainerHeight = 300, // Default for desktop
  mobileMagnifiedImageContainerWidth = 250, // Smaller for mobile
  mobileMagnifiedImageContainerHeight = 250,
  zoomFactor,
  magnifierOffset = { x: 15, y: 0 }, // Offset of magnified view from small image
}) => {
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [lensPosition, setLensPosition] = useState({ x: 0, y: 0 });
  const [magnifiedImagePosition, setMagnifiedImagePosition] = useState({ x: 0, y: 0});

  const smallImageRef = useRef(null);
  const isMobile = useMediaQuery('(max-width: 768px)'); // Example breakpoint

  const actualZoomFactor = zoomFactor || (largeImageWidth / smallImageWidth);
  
  const currentMagnifiedContainerWidth = isMobile ? mobileMagnifiedImageContainerWidth : magnifiedImageContainerWidth;
  const currentMagnifiedContainerHeight = isMobile ? mobileMagnifiedImageContainerHeight : magnifiedImageContainerHeight;

  const lensWidth = currentMagnifiedContainerWidth / actualZoomFactor;
  const lensHeight = currentMagnifiedContainerHeight / actualZoomFactor;

  const calculatePositions = useCallback((clientX, clientY) => {
    if (!smallImageRef.current) return;

    const rect = smallImageRef.current.getBoundingClientRect();
    
    let x = clientX - rect.left;
    let y = clientY - rect.top;

    // Calculate lens top-left position, centered on cursor/touch
    let currentLensX = x - lensWidth / 2;
    let currentLensY = y - lensHeight / 2;

    // Constrain lens within the small image
    currentLensX = Math.max(0, Math.min(currentLensX, smallImageWidth - lensWidth));
    currentLensY = Math.max(0, Math.min(currentLensY, smallImageHeight - lensHeight));
    
    setLensPosition({ x: currentLensX, y: currentLensY });

    // Calculate background position for the magnified image
    const backgroundPosX = -currentLensX * actualZoomFactor;
    const backgroundPosY = -currentLensY * actualZoomFactor;
    setMagnifiedImagePosition({ x: backgroundPosX, y: backgroundPosY });

  }, [smallImageRef, lensWidth, lensHeight, smallImageWidth, smallImageHeight, actualZoomFactor]);


  const handleMouseEnter = (e) => {
    if (isMobile) return; // Desktop only
    setShowMagnifier(true);
    calculatePositions(e.clientX, e.clientY);
  };

  const handleMouseMove = (e) => {
    if (isMobile || !showMagnifier) return; // Desktop only and only if shown
    calculatePositions(e.clientX, e.clientY);
  };

  const handleMouseLeave = () => {
    if (isMobile) return; // Desktop only
    setShowMagnifier(false);
  };

  // Touch events for mobile
  const handleTouchStart = (e) => {
    if (!isMobile) return;
    e.preventDefault(); // Prevent page scroll while dragging on image
    setShowMagnifier(true);
    calculatePositions(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    if (!isMobile || !showMagnifier) return;
    e.preventDefault();
    calculatePositions(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!isMobile) return;
    setShowMagnifier(false);
  };
  
  // Determine position of magnified view container
  const magnifiedViewStyle = {
    width: `${currentMagnifiedContainerWidth}px`,
    height: `${currentMagnifiedContainerHeight}px`,
    backgroundImage: `url(${largeImageSrc || smallImageSrc})`,
    backgroundSize: `${largeImageWidth}px ${largeImageHeight}px`,
    backgroundPosition: `${magnifiedImagePosition.x}px ${magnifiedImagePosition.y}px`,
  };

  if (!isMobile) {
    // Position to the right of the small image for desktop
    magnifiedViewStyle.position = 'absolute';
    magnifiedViewStyle.top = `${magnifierOffset.y}px`;
    magnifiedViewStyle.left = `${smallImageWidth + magnifierOffset.x}px`;
    magnifiedViewStyle.zIndex = '100'; // Ensure it's on top
  } else {
    // For mobile, you might want a different positioning strategy
    // e.g., fixed at the top, or centered overlay.
    // For this example, we'll make it an overlay near the touch,
    // or simply below the image if preferred.
    // Let's try positioning it absolutely, but centered horizontally above/below or simply below.
    magnifiedViewStyle.position = 'absolute';
    magnifiedViewStyle.top = `${smallImageHeight + 10}px`; // Below the small image
    magnifiedViewStyle.left = `${(smallImageWidth - currentMagnifiedContainerWidth) / 2}px`; // Centered
    magnifiedViewStyle.zIndex = '1000'; // High z-index for mobile overlay
  }


  return (
    <div className={styles.magnifierContainer} style={{ width: smallImageWidth }}> {/* Ensure container wraps small image */}
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
          priority // If it's LCP
          draggable="false" // Prevents browser's default image drag
        />
        {showMagnifier && (
          <div
            className={styles.lens}
            style={{
              width: `${lensWidth}px`,
              height: `${lensHeight}px`,
              top: `${lensPosition.y}px`,
              left: `${lensPosition.x}px`,
            }}
          />
        )}
      </div>

      {showMagnifier && (
        <div
          className={`${styles.magnifiedImageContainer} ${isMobile ? styles.mobileMagnified : ''}`}
          style={magnifiedViewStyle}
        />
      )}
    </div>
  );
};

export default ImageMagnifier;