"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const drawerPositions = {
  left: "left-0 top-0 h-dvh w-[min(24rem,calc(100vw-1rem))]",
  right: "right-0 top-0 h-dvh w-[min(24rem,calc(100vw-1rem))]",
  bottom:
    "bottom-0 left-1/2 max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-lg -translate-x-1/2 rounded-t-2xl",
};

export default function Modal({
  isOpen,
  setIsOpen,
  children,
  title,
  openStyle = "right",
  contentClassName =
    "overflow-y-auto px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-14",
}) {
  const [entered, setEntered] = useState(false);
  const closeTimerRef = useRef(null);

  const closeDrawer = useCallback(() => {
    if (closeTimerRef.current) return;
    setEntered(false);
    closeTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
    }, 280);
  }, [setIsOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const animationFrame = window.requestAnimationFrame(() => {
      setEntered(true);
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const bodyPaddingRight = Number.parseFloat(
      window.getComputedStyle(document.body).paddingRight,
    ) || 0;
    const scrollbarWidth = Math.max(
      0,
      window.innerWidth - document.documentElement.clientWidth,
    );
    const closeOnEscape = (event) => {
      if (event.key === "Escape") closeDrawer();
    };

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${bodyPaddingRight + scrollbarWidth}px`;
    }
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [closeDrawer, isOpen]);

  if (!isOpen || typeof document === "undefined") return null;

  const position = drawerPositions[openStyle] || drawerPositions.right;
  const border =
    openStyle === "left"
      ? "border-r"
      : openStyle === "right"
        ? "border-l"
        : "border-t";
  const movement =
    openStyle === "left"
      ? entered
        ? "translate-x-0"
        : "-translate-x-full"
      : openStyle === "right"
        ? entered
          ? "translate-x-0"
          : "translate-x-full"
        : entered
          ? "translate-y-0"
          : "translate-y-full";

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="presentation">
      <button
        type="button"
        aria-label="Close drawer"
        className={`absolute inset-0 h-full w-full cursor-default bg-slate-950/60 backdrop-blur-[2px] transition-opacity duration-300 ease-out ${
          entered ? "opacity-100" : "opacity-0"
        }`}
        onClick={closeDrawer}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title || "Drawer"}
        className={`fixed z-[110] overflow-hidden border-border bg-surface text-text shadow-2xl transition-transform duration-300 ease-out will-change-transform ${border} ${position} ${movement}`}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={closeDrawer}
          aria-label="Close menu"
          className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-muted text-xl leading-none text-text-muted transition-colors hover:bg-primary-soft hover:text-primary"
        >
          ×
        </button>

        <div
          className={`h-full overscroll-contain bg-surface text-text ${contentClassName}`}
        >
          {title && (
            <h2 className="mb-3 border-b border-border pb-3 text-xl font-bold text-text">
              {title}
            </h2>
          )}
          {children}
        </div>
      </aside>
    </div>,
    document.body,
  );
}
