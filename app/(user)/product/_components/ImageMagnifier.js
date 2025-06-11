// components/ImageMagnifier.js
'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import styles from './ImageMagnifier.module.css';
import useMediaQuery from '@/hooks/useMediaQuery';

const ImageMagnifier = ({
  smallImageSrc,
  smallImageAlt = "Product Image",
  aspectRatio = "1/1",
  largeImageSrc,
  largeImageWidth,
  largeImageHeight,
  overlayColor = "rgba(0, 0, 0, 0.6)",
  zoomFactor,

  // --- Desktop Props ---
  magnifiedImageContainerWidth = 350,
  magnifiedImageContainerHeight = 350,
  magnifierOffset = { x: 20, y: 0 },

  // --- Mobile Props ---
  mobileMagnifierSize = 150,
  // Padding from the image edge for the mobile magnifier
  mobileMagnifierPadding = 10,
}) => {
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [renderedDims, setRenderedDims] = useState({ width: 0, height: 0 });

  const smallImageWrapperRef = useRef(null);
  const animationFrameId = useRef(null);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const transitionDuration = 200;

  useEffect(() => {
    const wrapper = smallImageWrapperRef.current;
    if (!wrapper) return;
    const observer = new ResizeObserver(() => {
      setRenderedDims({
        width: wrapper.offsetWidth,
        height: wrapper.offsetHeight,
      });
    });
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  const { width: smallImageWidth, height: smallImageHeight } = renderedDims;
  const actualZoomFactor = zoomFactor || (smallImageWidth > 0 ? largeImageWidth / smallImageWidth : 1);
  
  // --- Pixel Perfecting Fix ---
  // A small buffer to prevent rendering artifacts (white lines) at the edges.
  const pixelBuffer = 2;
  const effectiveLargeWidth = smallImageWidth * actualZoomFactor;
  const effectiveLargeHeight = smallImageHeight * actualZoomFactor;

  // Desktop calculations
  const lensWidth = magnifiedImageContainerWidth / actualZoomFactor;
  const lensHeight = magnifiedImageContainerHeight / actualZoomFactor;
  const desktopLensX = Math.max(0, Math.min(cursorPosition.x - lensWidth / 2, smallImageWidth - lensWidth));
  const desktopLensY = Math.max(0, Math.min(cursorPosition.y - lensHeight / 2, smallImageHeight - lensHeight));
  
  // Background positions
  const desktopBgPosX = -(desktopLensX * actualZoomFactor);
  const desktopBgPosY = -(desktopLensY * actualZoomFactor);
  // Adjusted mobile position to account for the pixel buffer
  const mobileBgPosX = -cursorPosition.x * actualZoomFactor + mobileMagnifierSize / 2 - pixelBuffer / 2;
  const mobileBgPosY = -cursorPosition.y * actualZoomFactor + mobileMagnifierSize / 2 - pixelBuffer / 2;

  // --- NEW Quadrant-Based Mobile Magnifier Positioning ---
  let finalMagnifierX, finalMagnifierY;
  if (isMobile) {
    // Check if the cursor is in the top-left quadrant of the image
    const isInTopLeftQuadrant = cursorPosition.y < smallImageHeight / 2 && cursorPosition.x < smallImageWidth / 2;
    
    if (isInTopLeftQuadrant) {
      // If finger is in top-left, move magnifier to top-right
      finalMagnifierX = smallImageWidth - mobileMagnifierSize - mobileMagnifierPadding;
      finalMagnifierY = mobileMagnifierPadding;
    } else {
      // Default position is top-left for all other quadrants
      finalMagnifierX = mobileMagnifierPadding;
      finalMagnifierY = mobileMagnifierPadding;
    }
  }

  // --- Event Handlers (Unchanged) ---
  const updateCursorPosition = useCallback((clientX, clientY) => {
    const rect = smallImageWrapperRef.current?.getBoundingClientRect();
    if (rect) {
      const x = Math.max(0, Math.min(clientX - rect.left, smallImageWidth));
      const y = Math.max(0, Math.min(clientY - rect.top, smallImageHeight));
      setCursorPosition({ x, y });
    }
  }, [smallImageWidth, smallImageHeight]);

  const handleInteractionStart = useCallback((clientX, clientY) => {
    if (smallImageWidth > 0) { setShowMagnifier(true); setTimeout(() => setIsActive(true), 0); updateCursorPosition(clientX, clientY); }
  }, [smallImageWidth, updateCursorPosition]);

  const handleInteractionMove = useCallback((clientX, clientY) => {
    if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    animationFrameId.current = requestAnimationFrame(() => updateCursorPosition(clientX, clientY));
  }, [updateCursorPosition]);

  const handleInteractionEnd = useCallback(() => {
    setIsActive(false); setTimeout(() => setShowMagnifier(false), transitionDuration);
  }, []);

  const zoomBackgroundImage = `url(${largeImageSrc}), url(${smallImageSrc})`;

  if (smallImageWidth === 0) {
    return (<div ref={smallImageWrapperRef} className={styles.smallImageWrapper} style={{ aspectRatio }}><Image src={smallImageSrc} alt={smallImageAlt} layout="fill" objectFit="contain" priority /></div>);
  }

  return (
    <div className={styles.magnifierRootContainer}>
      <div
        ref={smallImageWrapperRef}
        className={styles.smallImageWrapper}
        style={{ aspectRatio, touchAction: isMobile ? 'none' : 'auto' }}
        onMouseEnter={(e) => !isMobile && handleInteractionStart(e.clientX, e.clientY)}
        onMouseMove={(e) => !isMobile && isActive && handleInteractionMove(e.clientX, e.clientY)}
        onMouseLeave={() => !isMobile && handleInteractionEnd()}
        onTouchStart={(e) => isMobile && handleInteractionStart(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => isMobile && isActive && handleInteractionMove(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={() => isMobile && handleInteractionEnd()}
      >
        <Image src={smallImageSrc} alt={smallImageAlt} layout="fill" objectFit="contain" priority draggable="false" />
        {showMagnifier && (
          <>
            <div className={styles.imageOverlay} style={{ backgroundColor: overlayColor, clipPath: `path(evenodd, "M 0 0 H ${smallImageWidth} V ${smallImageHeight} H 0 Z M ${cursorPosition.x} ${cursorPosition.y} m -40, 0 a 40,40 0 1,0 80,0 a 40,40 0 1,0 -80,0 Z")`, opacity: isActive ? 1 : 0 }} />
            {isMobile ? (
              <div
                className={styles.mobileMagnifier}
                style={{
                  width: `${mobileMagnifierSize}px`,
                  height: `${mobileMagnifierSize}px`,
                  transform: `translate(${finalMagnifierX}px, ${finalMagnifierY}px)`,
                  backgroundImage: zoomBackgroundImage,
                  // Apply pixel-perfecting fix to background size
                  backgroundSize: `${effectiveLargeWidth + pixelBuffer}px ${effectiveLargeHeight + pixelBuffer}px`,
                  backgroundPosition: `${mobileBgPosX}px ${mobileBgPosY}px`,
                  opacity: isActive ? 1 : 0,
                }}
              />
            ) : (
              <div className={styles.desktopLens} style={{ width: `${lensWidth}px`, height: `${lensHeight}px`, transform: `translate(${desktopLensX}px, ${desktopLensY}px)`, opacity: isActive ? 1 : 0 }} />
            )}
          </>
        )}
      </div>

      {!isMobile && showMagnifier && (
        <div
          className={styles.desktopMagnifiedImageContainer}
          style={{
            width: `${magnifiedImageContainerWidth}px`,
            height: `${magnifiedImageContainerHeight}px`,
            top: `${magnifierOffset.y}px`,
            left: `${smallImageWidth + magnifierOffset.x}px`,
            backgroundImage: zoomBackgroundImage,
            backgroundSize: `${effectiveLargeWidth}px ${effectiveLargeHeight}px`,
            backgroundPosition: `${desktopBgPosX}px ${desktopBgPosY}px`,
            opacity: isActive ? 1 : 0,
          }}
        />
      )}
    </div>
  );
};

export default ImageMagnifier;