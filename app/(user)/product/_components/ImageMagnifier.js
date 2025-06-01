// components/ImageMagnifier.js
'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import styles from './ImageMagnifier.module.css';
import useMediaQuery from '@/hooks/useMediaQuery'; // Adjust path if needed

const ImageMagnifier = ({
  smallImageSrc,
  smallImageAlt = "Product Image",
  // Remove fixed smallImageWidth/Height from props if we want it to be responsive
  // smallImageWidth,
  // smallImageHeight,
  aspectRatio = "1/1", // Default to square, e.g., "16/9", "4/3", or pass null for natural
  largeImageSrc,
  largeImageWidth, // Actual width of the large image file
  largeImageHeight, // Actual height of the large image file
  magnifiedImageContainerWidth = 300,
  magnifiedImageContainerHeight = 300,
  zoomFactor,
  magnifierOffset = { x: 15, y: 0 },
  glassMagnifierSize = 150,
  mobileGlassMagnifierOffset = { x: 0, y: -90 }, // Offset glass UP from finger
}) => {
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  
  // State for responsive small image dimensions
  const [renderedSmallImageDims, setRenderedSmallImageDims] = useState({ width: 0, height: 0 });

  const smallImageWrapperRef = useRef(null); // Changed from smallImageRef
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Effect to get and update rendered dimensions of the small image
  useEffect(() => {
    const wrapper = smallImageWrapperRef.current;
    if (!wrapper) return;

    const updateDimensions = () => {
      setRenderedSmallImageDims({
        width: wrapper.offsetWidth,
        height: wrapper.offsetHeight,
      });
    };

    updateDimensions(); // Initial dimensions

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(wrapper);

    return () => resizeObserver.disconnect();
  }, []); // Empty dependency array ensures this runs once on mount and cleans up

  // Use rendered dimensions for calculations
  const currentSmallImageWidth = renderedSmallImageDims.width;
  const currentSmallImageHeight = renderedSmallImageDims.height;

  const actualZoomFactor = zoomFactor || (currentSmallImageWidth > 0 ? largeImageWidth / currentSmallImageWidth : 1);

  let currentLensWidth, currentLensHeight;
  if (isMobile) {
    currentLensWidth = glassMagnifierSize;
    currentLensHeight = glassMagnifierSize;
  } else {
    currentLensWidth = currentSmallImageWidth > 0 ? magnifiedImageContainerWidth / actualZoomFactor : 0;
    currentLensHeight = currentSmallImageHeight > 0 ? magnifiedImageContainerHeight / actualZoomFactor : 0;
  }

  // Lens display position (where the visual lens/glass is shown)
  let lensDisplayX = cursorPosition.x - currentLensWidth / 2;
  let lensDisplayY = cursorPosition.y - currentLensHeight / 2;

  if (isMobile) {
    lensDisplayX += mobileGlassMagnifierOffset.x;
    lensDisplayY += mobileGlassMagnifierOffset.y;
  }
  
  // Constrained lens position (for background calculation, always within image bounds)
  // This refers to the *area* of the small image being sampled.
  const constrainedSampleAreaX = Math.max(0, Math.min(cursorPosition.x - currentLensWidth / 2, currentSmallImageWidth - currentLensWidth));
  const constrainedSampleAreaY = Math.max(0, Math.min(cursorPosition.y - currentLensHeight / 2, currentSmallImageHeight - currentLensHeight));


  const backgroundPosX = -(constrainedSampleAreaX * actualZoomFactor);
  const backgroundPosY = -(constrainedSampleAreaY * actualZoomFactor);


  const calculatePositions = useCallback((clientX, clientY) => {
    if (!smallImageWrapperRef.current || currentSmallImageWidth === 0) return;
    const rect = smallImageWrapperRef.current.getBoundingClientRect();
    
    const x = Math.max(0, Math.min(clientX - rect.left, currentSmallImageWidth));
    const y = Math.max(0, Math.min(clientY - rect.top, currentSmallImageHeight));
    
    setCursorPosition({ x, y });

  }, [currentSmallImageWidth, currentSmallImageHeight]); // Depend on rendered dimensions

  // Event handlers (largely the same, but ensure they use currentSmallImageWidth/Height for checks if any)
  const handleMouseEnter = (e) => {
    if (isMobile || currentSmallImageWidth === 0) return;
    setShowMagnifier(true);
    calculatePositions(e.clientX, e.clientY);
  };

  const handleMouseMove = (e) => {
    if (isMobile || !showMagnifier || currentSmallImageWidth === 0) return;
    calculatePositions(e.clientX, e.clientY);
  };

  const handleMouseLeave = () => {
    if (isMobile || currentSmallImageWidth === 0) return;
    setShowMagnifier(false);
  };

  const handleTouchStart = (e) => {
    if (!isMobile || currentSmallImageWidth === 0) return;
    setShowMagnifier(true);
    calculatePositions(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    if (!isMobile || !showMagnifier || currentSmallImageWidth === 0) return;
    e.preventDefault();
    calculatePositions(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!isMobile || currentSmallImageWidth === 0) return;
    setShowMagnifier(false);
  };
  
  const commonLensStyle = {
    width: `${currentLensWidth}px`,
    height: `${currentLensHeight}px`,
    top: `${lensDisplayY}px`,
    left: `${lensDisplayX}px`,
  };

  // If dimensions are not yet calculated, don't render magnifier parts
  if (currentSmallImageWidth === 0 || currentSmallImageHeight === 0) {
    return (
      <div
        ref={smallImageWrapperRef}
        className={styles.smallImageWrapperInitial}
        style={{ aspectRatio: aspectRatio || undefined }}
      >
        {aspectRatio ? (
            <Image src={smallImageSrc} alt={smallImageAlt} layout="fill" objectFit="contain" priority />
        ) : (
            <Image src={smallImageSrc} alt={smallImageAlt} width={largeImageWidth} height={largeImageHeight} layout="intrinsic" priority />
        )}
      </div>
    );
  }

  return (
    <div className={styles.magnifierContainer} style={{ width: currentSmallImageWidth }}>
      <div
        ref={smallImageWrapperRef} // Use this ref on the wrapper
        className={styles.smallImageWrapper}
        style={{ 
            width: currentSmallImageWidth, 
            height: currentSmallImageHeight,
            aspectRatio: aspectRatio || undefined // Maintain aspect ratio
        }}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Use Next/Image with layout="fill" and objectFit for responsiveness within the wrapper */}
        {aspectRatio ? (
            <Image 
                src={smallImageSrc} 
                alt={smallImageAlt} 
                layout="fill" 
                objectFit="contain" // or "cover"
                priority 
                draggable="false"
                style={{ touchAction: isMobile ? 'none' : 'auto' }}
            />
        ) : ( // Fallback for natural aspect ratio if aspectRatio prop is null/undefined
            <Image 
                src={smallImageSrc} 
                alt={smallImageAlt} 
                width={largeImageWidth} // Provide intrinsic width for layout="intrinsic"
                height={largeImageHeight} // Provide intrinsic height
                layout="intrinsic" // Or "responsive" if parent has width
                priority 
                draggable="false"
                style={{ touchAction: isMobile ? 'none' : 'auto' }}
            />
        )}


        {/* Desktop Lens (semi-transparent square) */}
        {showMagnifier && !isMobile && (
          <div
            className={styles.desktopLens}
            style={{
              width: `${currentLensWidth}px`,
              height: `${currentLensHeight}px`,
              // For desktop lens, keep it strictly within image bounds (visually)
              top: `${Math.max(0, Math.min(cursorPosition.y - currentLensHeight / 2, currentSmallImageHeight - currentLensHeight))}px`,
              left: `${Math.max(0, Math.min(cursorPosition.x - currentLensWidth / 2, currentSmallImageWidth - currentLensWidth))}px`,
            }}
          />
        )}

        {/* Mobile Glass Magnifier */}
        {showMagnifier && isMobile && (
          <div
            className={styles.mobileGlassMagnifier}
            style={{
              ...commonLensStyle, // This now includes the mobile offset
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
            left: `${currentSmallImageWidth + magnifierOffset.x}px`,
          }}
        />
      )}
    </div>
  );
};

export default ImageMagnifier;