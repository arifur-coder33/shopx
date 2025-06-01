// components/ImageMagnifier.js (or your path)
'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
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
      if (wrapper.offsetWidth > 0 && wrapper.offsetHeight > 0) { // Ensure valid dimensions
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

  const currentSmallImageWidth = renderedSmallImageDims.width;
  const currentSmallImageHeight = renderedSmallImageDims.height;

  // Ensure actualZoomFactor is not NaN or Infinity if dimensions are momentarily zero
  const actualZoomFactor = zoomFactor || 
    (currentSmallImageWidth > 0 && largeImageWidth > 0 ? largeImageWidth / currentSmallImageWidth : 1);


  // --- Desktop Lens Calculations ---
  // The visual lens on the small image
  const desktopVisualLensWidth = currentSmallImageWidth > 0 ? magnifiedImageContainerWidth / actualZoomFactor : 0;
  const desktopVisualLensHeight = currentSmallImageHeight > 0 ? magnifiedImageContainerHeight / actualZoomFactor : 0;
  
  // Top-left position of this visual desktop lens, constrained within the small image
  const desktopVisualLensX = Math.max(0, Math.min(cursorOnImagePosition.x - desktopVisualLensWidth / 2, currentSmallImageWidth - desktopVisualLensWidth));
  const desktopVisualLensY = Math.max(0, Math.min(cursorOnImagePosition.y - desktopVisualLensHeight / 2, currentSmallImageHeight - desktopVisualLensHeight));

  // --- Mobile Zoom Panel Calculations ---
  const mobilePanelActualUiWidth = (mobileZoomPanelWidthPercentage / 100) * currentSmallImageWidth;
  // The area on the small image that needs to be sampled to fill the mobile zoom panel
  const mobileContentSampleAreaWidth = mobilePanelActualUiWidth / actualZoomFactor;
  const mobileContentSampleAreaHeight = mobileZoomPanelHeight / actualZoomFactor;

  // Top-left of this sample area on the small image, centered on cursor/touch point, constrained
  const mobileContentSampleAreaX = Math.max(0, Math.min(cursorOnImagePosition.x - mobileContentSampleAreaWidth / 2, currentSmallImageWidth - mobileContentSampleAreaWidth));
  const mobileContentSampleAreaY = Math.max(0, Math.min(cursorOnImagePosition.y - mobileContentSampleAreaHeight / 2, currentSmallImageHeight - mobileContentSampleAreaHeight));

  // CORRECTED and UNIFIED: Background position for magnified content
  let bgPosX, bgPosY;
  // The size of the large image as it should appear in the background of the zoom containers
  // This is the small image dimensions scaled up by the zoom factor.
  const effectiveLargeImageBackgroundWidth = currentSmallImageWidth * actualZoomFactor;
  const effectiveLargeImageBackgroundHeight = currentSmallImageHeight * actualZoomFactor;


  if (isMobile) {
    // For mobile, the background position is based on the top-left of the content sample area
    bgPosX = -(mobileContentSampleAreaX * actualZoomFactor);
    bgPosY = -(mobileContentSampleAreaY * actualZoomFactor);
  } else {
    // For desktop, the background position is based on the top-left of the visual desktop lens
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
        style={{ aspectRatio: aspectRatio || undefined }}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {aspectRatio ? (
          <Image src={smallImageSrc} alt={smallImageAlt} layout="fill" objectFit="contain" priority draggable="false" style={{ touchAction: isMobile ? 'none' : 'auto' }}/>
        ) : (
          <Image src={smallImageSrc} alt={smallImageAlt} width={largeImageWidth} height={largeImageHeight} layout="responsive" priority draggable="false" style={{ touchAction: isMobile ? 'none' : 'auto' }}/>
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