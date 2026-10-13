"use client";

import { useEffect, useState } from "react";

const Modal = ({ isOpen, onClose, children, isLoading }) => {
  const [isClient, setIsClient] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (isOpen) {
      setTimeout(() => setIsAnimating(true), 50); // Start animation slightly after render
    } else {
      setIsAnimating(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;
  if (!isClient) return null; // Prevent hydration mismatch

  return (
    <div
      role="presentation"
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 transition-opacity duration-300 ease-in-out sm:p-4 ${
        isOpen ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`relative max-h-[calc(100dvh-1rem)] w-full max-w-6xl overflow-hidden rounded-2xl border border-border bg-surface p-3 shadow-2xl transition-all duration-300 sm:max-h-[calc(100dvh-2rem)] sm:p-6 ${
          isAnimating ? "scale-100 opacity-100" : "scale-0 opacity-50 "
        } `}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-surface-muted text-text-muted hover:text-text"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Modal Content */}
        <div className="max-h-[calc(100dvh-4.5rem)] overflow-y-auto overscroll-contain p-px pt-10 sm:max-h-[calc(100dvh-6rem)]">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
