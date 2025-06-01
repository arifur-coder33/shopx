// components/ImageMagnifier.js
'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import styles from './ImageMagnifier.module.css';
import useMediaQuery from '@/hooks/useMediaQuery'; // Adjust path if needed

const ImageMagnifier = ({
  smallImageSrc,
  smallImageAlt = "Product Image",
  aspectRatio = "1/1", // e.g., "16/9", "4/3". If null, attempts natural aspect ratio.
  largeImageSrc,
  largeImageWidth, // Actual width of the large image file
  largeImageHeight, // Actual height of the large image file
  magnifiedImageContainerWidth = 300, // Desktop zoom panel width
  magnifiedImageContainerHeight = 300, // Desktop zoom panel height
  zoomFactor, // Optional: explicit zoom factor
  magnifierOffset = { x: 15, y: 0 }, // Desktop zoom panel offset
  glassMagnifierSize = 150, // Mobile: diameter of the circular glass
  mobileGlassMagnifierUIVisibleOffset = { x: 0, y: -90 }, // How much to shift the *visual* glass UI up
}) => {
  const [showMagnifier, setShowMagnifier] = useState(false);
  // Position of the cursor/touch relative to the small image wrapper
  const [cursorOnImagePosition, setCursorOnImagePosition] = useState({ x: 0, y: 0 });
  
  const [renderedSmallImageDims, setRenderedSmallImageDims] = useState({ width: 0, height: 0 });

  const smallImageWrapperRef = useRef(null);
  const isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(() => {
    const wrapper = smallImageWrapperRef.current;
    if (!wrapper) return;

    const updateDimensions = () => {
      setRenderedSmallImageDims({
        width: wrapper.offsetWidth,
        height: wrapper.offsetHeight,
      });
    };
    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(wrapper);
    return () => resizeObserver.disconnect();
  }, []);

  const currentSmallImageWidth = renderedSmallImageDims.width;
  const currentSmallImageHeight = renderedSmallImageDims.height;

  const actualZoomFactor = zoomFactor || (currentSmallImageWidth > 0 ? largeImageWidth / currentSmallImageWidth : 1);

  // Determine the size of the lens/glass UI element
  let uiLensWidth, uiLensHeight;
  if (isMobile) {
    uiLensWidth = glassMagnifierSize;
    uiLensHeight = glassMagnifierSize;
  } else {
    uiLensWidth = currentSmallImageWidth > 0 ? magnifiedImageContainerWidth / actualZoomFactor : 0;
    uiLensHeight = currentSmallImageHeight > 0 ? magnifiedImageContainerHeight / actualZoomFactor : 0;
  }

  // Calculate the top-left position for the *visual* lens/glass UI
  // This is centered on the cursor/touch, then offset for mobile visibility
  let visualLensUiX = cursorOnImagePosition.x - uiLensWidth / 2;
  let visualLensUiY = cursorOnImagePosition.y - uiLensHeight / 2;

  if (isMobile) {
    visualLensUiX += mobileGlassMagnifierUIVisibleOffset.x;
    visualLensUiY += mobileGlassMagnifierUIVisibleOffset.y;
  }
  
  // Calculate the top-left corner of the *area on the small image* that is being sampled for magnification.
  // This area is always centered under the actual cursor/touch point.
  // The size of this sample area is uiLensWidth/Height for mobile (the glass size),
  // or the calculated desktop lens size for desktop.
  const sampleAreaX = Math.max(0, Math.min(cursorOnImagePosition.x - uiLensWidth / 2, currentSmallImageWidth - uiLensWidth));
  const sampleAreaY = Math.max(0, Math.min(cursorOnImagePosition.y - uiLensHeight / 2, currentSmallImageHeight - uiLensHeight));

  // Calculate background position for the magnified image content
  const backgroundPosX = -(sampleAreaX * actualZoomFactor);
  const backgroundPosY = -(sampleAreaY * actualZoomFactor);

  const calculateInteractionPoint = useCallback((clientX, clientY) => {
    if (!smallImageWrapperRef.current || currentSmallImageWidth === 0) return;
    const rect = smallImageWrapperRef.current.getBoundingClientRect();
    
    const x = Math.max(0, Math.min(clientX - rect.left, currentSmallImageWidth));
    const y = Math.max(0, Math.min(clientY - rect.top, currentSmallImageHeight));
    
    setCursorOnImagePosition({ x, y });

  }, [currentSmallImageWidth, currentSmallImageHeight]);

  const handleMouseEnter = (e) => {
    if (isMobile || currentSmallImageWidth === 0) return;
    setShowMagnifier(true);
    calculateInteractionPoint(e.clientX, e.clientY);
  };

  const handleMouseMove = (e) => {
    if (isMobile || !showMagnifier || currentSmallImageWidth === 0) return;
    calculateInteractionPoint(e.clientX, e.clientY);
  };

  const handleMouseLeave = () => {
    if (isMobile || currentSmallImageWidth === 0) return;
    setShowMagnifier(false);
  };

  const handleTouchStart = (e) => {
    if (!isMobile || currentSmallImageWidth === 0) return;
    setShowMagnifier(true);
    calculateInteractionPoint(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    if (!isMobile || !showMagnifier || currentSmallImageWidth === 0) return;
    e.preventDefault();
    calculateInteractionPoint(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!isMobile || currentSmallImageWidth === 0) return;
    setShowMagnifier(false);
  };
  
  // Style for the visual lens/glass UI element
  const visualLensUiStyle = {
    width: `${uiLensWidth}px`,
    height: `${uiLensHeight}px`,
    top: `${visualLensUiY}px`,
    left: `${visualLensUiX}px`,
  };

  if (currentSmallImageWidth === 0 || currentSmallImageHeight === 0) {
    // Initial state before dimensions are known, ensure wrapper respects aspect ratio
    return (
      <div
        ref={smallImageWrapperRef}
        className={styles.smallImageWrapperInitial}
        style={{ aspectRatio: aspectRatio || undefined }}
      >
        {aspectRatio ? (
          <Image src={smallImageSrc} alt={smallImageAlt} layout="fill" objectFit="contain" priority />
        ) : (
          // For natural aspect ratio, provide intrinsic dimensions to Next/Image
          // This helps the wrapper establish its initial size if parent doesn't constrain height
          <Image src={smallImageSrc} alt={smallImageAlt} width={largeImageWidth} height={largeImageHeight} layout="intrinsic" priority />
        )}
      </div>
    );
  }

  return (
    // magnifierContainer should not enforce its own width, it should adapt or be controlled by parent CSS
    <div className={styles.magnifierContainer}>
      <div
        ref={smallImageWrapperRef}
        className={styles.smallImageWrapper}
        // The wrapper itself will get its dimensions from its parent or its intrinsic content + aspect ratio
        // No explicit width/height here to allow it to be responsive.
        style={{ aspectRatio: aspectRatio || undefined }}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {aspectRatio ? (
          <Image 
            src={smallImageSrc} 
            alt={smallImageAlt} 
            layout="fill" 
            objectFit="contain"
            priority 
            draggable="false"
            style={{ touchAction: isMobile ? 'none' : 'auto' }}
          />
        ) : (
          <Image 
            src={smallImageSrc} 
            alt={smallImageAlt} 
            width={largeImageWidth} // For layout="intrinsic" or "responsive"
            height={largeImageHeight}
            layout="responsive" // Or intrinsic. 'responsive' works if parent has width.
            priority 
            draggable="false"
            style={{ touchAction: isMobile ? 'none' : 'auto' }}
          />
        )}

        {showMagnifier && !isMobile && (
          <div
            className={styles.desktopLens}
            style={{
              ...visualLensUiStyle, // Desktop lens also uses this for its position
              // Ensure desktop lens stays visually within bounds if preferred
              top: `${Math.max(0, Math.min(cursorOnImagePosition.y - uiLensHeight / 2, currentSmallImageHeight - uiLensHeight))}px`,
              left: `${Math.max(0, Math.min(cursorOnImagePosition.x - uiLensWidth / 2, currentSmallImageWidth - uiLensWidth))}px`,
            }}
          />
        )}

        {showMagnifier && isMobile && (
          <div
            className={styles.mobileGlassMagnifier}
            style={{
              ...visualLensUiStyle, // Position the UI element with offset
              backgroundImage: `url(${largeImageSrc || smallImageSrc})`,
              backgroundSize: `${largeImageWidth}px ${largeImageHeight}px`,
              // Background position is based on the *actual touch point* (sampleAreaX/Y)
              backgroundPosition: `${backgroundPosX}px ${backgroundPosY}px`,
            }}
          />
        )}
      </div>

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
            // Position relative to the *rendered* width of the small image
            left: `${currentSmallImageWidth + magnifierOffset.x}px`,
          }}
        />
      )}
    </div>
  );
};

export default ImageMagnifier;