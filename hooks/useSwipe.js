// hooks/useSwipe.js (create a new 'hooks' folder if you don't have one)
'use client';
import { useRef, useCallback } from 'react';

const defaultOptions = {
  swipeThreshold: 40, // Min pixels to be considered a swipe
  timeThreshold: 300,  // Max milliseconds for a swipe
};

export function useSwipe(options) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    enabled = true,
  } = options;

  const config = { ...defaultOptions, ...options };
  const touchStart = useRef({ x: 0, y: 0, time: 0 });

  const handleTouchStart = useCallback((e) => {
    if (!enabled) return;
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY, time: Date.now() };
  }, [enabled]);

  const handleTouchEnd = useCallback((e) => {
    if (!enabled) return;
    const touchEndTime = Date.now();
    const t = e.changedTouches[0];
    const deltaX = t.clientX - touchStart.current.x;
    const deltaY = t.clientY - touchStart.current.y;
    const duration = touchEndTime - touchStart.current.time;

    if (duration > config.timeThreshold) return;

    if (Math.abs(deltaX) > Math.abs(deltaY)) { // It's a horizontal swipe
      if (deltaX > config.swipeThreshold && onSwipeRight) {
        onSwipeRight();
      } else if (deltaX < -config.swipeThreshold && onSwipeLeft) {
        onSwipeLeft();
      }
    } else { // It's a vertical swipe
      if (deltaY > config.swipeThreshold && onSwipeDown) {
        onSwipeDown();
      } else if (deltaY < -config.swipeThreshold && onSwipeUp) {
        onSwipeUp();
      }
    }
  }, [enabled, config, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  // We only need to return the start and end handlers
  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
  };
}