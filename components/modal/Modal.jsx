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
      className={`fixed  inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70  transition-opacity duration-300 ease-in-out ${
        isOpen ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className={` bg-white max-w-6xl dark:bg-slate-900 rounded border-2 shadow-xl shadow-black dark:shadow-slate-500 p-4 md:p-6 lg:p-8 m-4 relative transition-all duration-500 ease-in-out transform ${
          isAnimating ? "scale-100 opacity-100" : "scale-0 opacity-50 "
        } `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 focus:outline-none"
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
        <div className="max-h-[90vh] overflow-y-auto p-px">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
