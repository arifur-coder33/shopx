// components/ImageZoomer.js
'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import styles from './ImageZoomer.module.css';
import useMediaQuery from '@/hooks/useMediaQuery';

const clamp = (val, min, max) => Math.max(min, Math.min(val, max));

const ZoomIcon = () => (<svg className={styles.iconSvg} viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zM10 9h-1V6h2v3h3v2h-3v3H9v-3H6V9h3z"/></svg>);
const CloseIcon = () => (<svg className={styles.iconSvg} viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>);

const ImageZoomer = ({
  smallImageSrc,
  largeImageSrc,
  alt = "Product Image",
  aspectRatio = "1/1",
  overlayBackgroundColor = "rgba(0, 0, 0, 0.85)",
  zoomIcon = true,
}) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const [isLargeImageLoaded, setIsLargeImageLoaded] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  useEffect(() => {
    const img = new window.Image();
    img.src = largeImageSrc;
    img.onload = () => setIsLargeImageLoaded(true);
  }, [largeImageSrc]);

  const handleOpen = () => { if (isMobile) { setIsZoomed(true); document.body.style.overflow = 'hidden'; }};
  const handleClose = useCallback(() => { setIsZoomed(false); document.body.style.overflow = ''; }, []);

  return (
    // The new root container allows sibling positioning for desktop zoom
    <div className={styles.zoomerRootContainer}>
      <div className={styles.smallImageContainer} onClick={handleOpen} style={{ aspectRatio }}>
        <Image src={smallImageSrc} alt={alt} layout="fill" objectFit="contain" priority />
        {isMobile && zoomIcon && <div className={styles.zoomIconWrapper}><ZoomIcon /></div>}
      </div>

      {/* --- CORRECTED DESKTOP ZOOMER PLACEMENT --- */}
      {/* It's now a sibling, so it won't be clipped by `overflow: hidden` */}
      {!isMobile && isLargeImageLoaded && (
        <DesktopHoverZoomer largeImageSrc={largeImageSrc} />
      )}
      
      {isZoomed && isLargeImageLoaded && (
        <MobileModalZoomer
          largeImageSrc={largeImageSrc}
          alt={alt}
          backgroundColor={overlayBackgroundColor}
          onClose={handleClose}
        />
      )}
    </div>
  );
};

const DesktopHoverZoomer = ({ largeImageSrc }) => {
  const [isActive, setIsActive] = useState(false);
  const [position, setPosition] = useState({ x: 0.5, y: 0.5 });
  const containerRef = useRef(null);

  const handleMouseMove = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((e.clientY - rect.top) / rect.height, 0, 1);
    setPosition({ x, y });
  };
  
  return (
    // This overlay captures mouse events over the small image area
    <div
      ref={containerRef}
      className={styles.desktopEventCaptureOverlay}
      onMouseEnter={() => setIsActive(true)}
      onMouseLeave={() => setIsActive(false)}
      onMouseMove={handleMouseMove}
    >
      {/* The visible zoom panel itself */}
      <div
        className={styles.desktopZoomPanel}
        style={{
          backgroundImage: `url(${largeImageSrc})`,
          backgroundPosition: `${position.x * 100}% ${position.y * 100}%`,
          opacity: isActive ? 1 : 0,
          visibility: isActive ? 'visible' : 'hidden', // Better for performance
        }}
      />
    </div>
  );
};

// --- MobileModalZoomer (Unchanged) ---
const MobileModalZoomer = ({ largeImageSrc, alt, backgroundColor, onClose }) => {
    const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
    const imageRef = useRef(null);
    const lastTouch = useRef({ dist: 0, x: 0, y: 0 }).current;
    const isInteracting = useRef(false);
  
    const handleTouchStart = (e) => {
      isInteracting.current = true;
      if (e.touches.length === 2) {
          lastTouch.dist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
      } else if (e.touches.length === 1) {
          lastTouch.x = e.touches[0].pageX;
          lastTouch.y = e.touches[0].pageY;
      }
    };
  
    const handleTouchMove = (e) => {
      if (!isInteracting.current) return;
      e.preventDefault();
      if (e.touches.length === 2) {
          const newDist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
          const scale = clamp(transform.scale * (newDist / lastTouch.dist), 1, 5);
          setTransform(t => ({...t, scale }));
          lastTouch.dist = newDist;
      } else if (e.touches.length === 1) {
          const { width, height } = imageRef.current.getBoundingClientRect();
          const maxPanX = Math.max(0, (width * transform.scale - width) / 2);
          const maxPanY = Math.max(0, (height * transform.scale - height) / 2);
          const deltaX = e.touches[0].pageX - lastTouch.x;
          const deltaY = e.touches[0].pageY - lastTouch.y;
          const x = clamp(transform.x + deltaX, -maxPanX, maxPanX);
          const y = clamp(transform.y + deltaY, -maxPanY, maxPanY);
          setTransform(t => ({...t, x, y }));
          lastTouch.x = e.touches[0].pageX;
          lastTouch.y = e.touches[0].pageY;
      }
    };
  
    const handleTouchEnd = () => { isInteracting.current = false; };
    
    return createPortal(
      <div className={styles.modalBackdrop} style={{ backgroundColor }} onTouchStart={onClose}>
        <div className={styles.modalContent} onTouchStart={(e) => e.stopPropagation()}>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close image zoom"><CloseIcon /></button>
          <div className={styles.modalImageWrapper} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} ref={imageRef}>
            <Image src={largeImageSrc} alt={alt} layout="fill" objectFit="contain" draggable="false" style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }} />
          </div>
        </div>
      </div>,
      document.body
    );
};

export default ImageZoomer;