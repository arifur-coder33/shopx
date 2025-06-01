// components/ImageMagnifier.js (or your path)
'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image'; // Using standard Next/Image
import styles from './ImageMagnifier.module.css';
import useMediaQuery from '@/hooks/useMediaQuery'; // Ensure this path is correct

const ImageMagnifier = ({
  smallImageSrc,
  smallImageAlt = "Product Image",
  aspectRatio = "1/1", 
  largeImageSrc,
  largeImageWidth, 
  largeImageHeight,
  magnifiedImageContainerWidth = 300,
  magnifiedImageContainerHeight = 300,
  magnifierOffset = { x: 15, y: 0 },
  mobileZoomPanelHeight = 150,
  mobileZoomPanelTopOffset = 10,
  mobileZoomPanelWidthPercentage = 90,
  zoomFactor,
}) => {
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [cursorOnImagePosition, setCursorOnImagePosition] = useState({ x: 0, y: 0 });
  const [renderedSmallImageDims, setRenderedSmallImageDims] = useState({ width: 0, height: 0 });

  const smallImageWrapperRef = useRef(null);
  const isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(() => {
    const wrapper = smallImageWrapperRef.current;
    if (!wrapper) return;
    const updateDimensions = () => {
      if (wrapper.offsetWidth > 0 && wrapper.offsetHeight > 0) {
        setRenderedSmallImageDims({
          width: wrapper.offsetWidth,
          height: wrapper.offsetHeight,
        });
      }
    };
    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(wrapper);
    return () => resizeObserver.disconnect();
  }, []);

  // Effect to disable body scroll on mobile when magnifier is active
  useEffect(() => {
    if (isMobile && showMagnifier) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = ''; // Or 'auto' or whatever your default is
    }
    // Cleanup function to restore scroll when component unmounts or effect re-runs
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, showMagnifier]);


  const currentSmallImageWidth = renderedSmallImageDims.width;
  const currentSmallImageHeight = renderedSmallImageDims.height;

  const actualZoomFactor = zoomFactor || 
    (currentSmallImageWidth > 0 && largeImageWidth > 0 ? largeImageWidth / currentSmallImageWidth : 1);

  const desktopVisualLensWidth = currentSmallImageWidth > 0 ? magnifiedImageContainerWidth / actualZoomFactor : 0;
  const desktopVisualLensHeight = currentSmallImageHeight > 0 ? magnifiedImageContainerHeight / actualZoomFactor : 0;
  
  const desktopVisualLensX = Math.max(0, Math.min(cursorOnImagePosition.x - desktopVisualLensWidth / 2, currentSmallImageWidth - desktopVisualLensWidth));
  const desktopVisualLensY = Math.max(0, Math.min(cursorOnImagePosition.y - desktopVisualLensHeight / 2, currentSmallImageHeight - desktopVisualLensHeight));

  const mobilePanelActualUiWidth = (mobileZoomPanelWidthPercentage / 100) * currentSmallImageWidth;
  const mobileContentSampleAreaWidth = mobilePanelActualUiWidth / actualZoomFactor;
  const mobileContentSampleAreaHeight = mobileZoomPanelHeight / actualZoomFactor;

  const mobileContentSampleAreaX = Math.max(0, Math.min(cursorOnImagePosition.x - mobileContentSampleAreaWidth / 2, currentSmallImageWidth - mobileContentSampleAreaWidth));
  const mobileContentSampleAreaY = Math.max(0, Math.min(cursorOnImagePosition.y - mobileContentSampleAreaHeight / 2, currentSmallImageHeight - mobileContentSampleAreaHeight));

  const effectiveLargeImageBackgroundWidth = currentSmallImageWidth * actualZoomFactor;
  const effectiveLargeImageBackgroundHeight = currentSmallImageHeight * actualZoomFactor;

  let bgPosX, bgPosY;
  if (isMobile) {
    bgPosX = -(mobileContentSampleAreaX * actualZoomFactor);
    bgPosY = -(mobileContentSampleAreaY * actualZoomFactor);
  } else {
    bgPosX = -(desktopVisualLensX * actualZoomFactor);
    bgPosY = -(desktopVisualLensY * actualZoomFactor);
  }

  const calculateInteractionPoint = useCallback((clientX, clientY) => {
    if (!smallImageWrapperRef.current || currentSmallImageWidth === 0) return;
    const rect = smallImageWrapperRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, currentSmallImageWidth));
    const y = Math.max(0, Math.min(clientY - rect.top, currentSmallImageHeight));
    setCursorOnImagePosition({ x, y });
  }, [currentSmallImageWidth, currentSmallImageHeight]);

  // Event Handlers
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
    // No e.preventDefault() here, to allow normal tap actions if not dragging
    if (!isMobile || currentSmallImageWidth === 0) return;
    setShowMagnifier(true);
    calculateInteractionPoint(e.touches[0].clientX, e.touches[0].clientY);
  };
  const handleTouchMove = (e) => {
    if (!isMobile || !showMagnifier || currentSmallImageWidth === 0) return;
    // CRUCIAL: Prevent default scroll/pan behavior WHEN dragging for magnification
    e.preventDefault(); 
    calculateInteractionPoint(e.touches[0].clientX, e.touches[0].clientY);
  };
  const handleTouchEnd = () => {
    if (!isMobile || currentSmallImageWidth === 0) return;
    setShowMagnifier(false);
    // Scroll is re-enabled by the useEffect cleanup when showMagnifier becomes false
  };

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
    <div className={styles.magnifierContainer}>
      <div
        ref={smallImageWrapperRef}
        className={styles.smallImageWrapper}
        style={{ 
            aspectRatio: aspectRatio || undefined,
            // Apply touch-action directly to the element handling touch events
            touchAction: isMobile ? 'none' : 'auto' 
        }}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* The Next/Image component itself does not need touch-action if its parent handles it,
            and its pointer-events are none. */}
        {aspectRatio ? (
          <Image 
            src={smallImageSrc} 
            alt={smallImageAlt} 
            layout="fill" 
            objectFit="contain" 
            priority 
            draggable="false" 
            // style={{ touchAction: isMobile ? 'none' : 'auto' }} // Moved to wrapper
          />
        ) : (
          <Image 
            src={smallImageSrc} 
            alt={smallImageAlt} 
            width={largeImageWidth} 
            height={largeImageHeight} 
            layout="responsive" 
            priority 
            draggable="false" 
            // style={{ touchAction: isMobile ? 'none' : 'auto' }} // Moved to wrapper
          />
        )}

        {showMagnifier && !isMobile && (
          <div
            className={styles.desktopLens}
            style={{
              width: `${desktopVisualLensWidth}px`,
              height: `${desktopVisualLensHeight}px`,
              top: `${desktopVisualLensY}px`,
              left: `${desktopVisualLensX}px`,
            }}
          />
        )}
        
        {showMagnifier && isMobile && (
          <div 
            className={styles.mobileZoomPanel}
            style={{
              width: `${mobilePanelActualUiWidth}px`,
              height: `${mobileZoomPanelHeight}px`,
              backgroundImage: `url(${largeImageSrc || smallImageSrc})`,
              backgroundSize: `${effectiveLargeImageBackgroundWidth}px ${effectiveLargeImageBackgroundHeight}px`,
              backgroundPosition: `${bgPosX}px ${bgPosY}px`,
              top: `${mobileZoomPanelTopOffset}px`,
              left: `${(currentSmallImageWidth - mobilePanelActualUiWidth) / 2}px`,
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
            backgroundSize: `${effectiveLargeImageBackgroundWidth}px ${effectiveLargeImageBackgroundHeight}px`,
            backgroundPosition: `${bgPosX}px ${bgPosY}px`,
            top: `${magnifierOffset.y}px`,
            left: `${currentSmallImageWidth + magnifierOffset.x}px`,
          }}
        />
      )}
    </div>
  );
};

export default ImageMagnifier;