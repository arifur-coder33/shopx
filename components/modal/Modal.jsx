"use client"; // This is a client component

import { useEffect, useState } from "react";

const Modal = ({ isOpen, onClose, children }) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isOpen) return null;

  if (!isClient) return null; // prevents hydration mismatch

  return (
    <div
      className={`fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center transition-opacity duration-300 ease-in-out ${
        isOpen ? "opacity-100" : "opacity-0"
      }`}
      //   onClick={onClose}
    >
      <div
        className={`bg-white rounded shadow-lg p-4 md:p-6 lg:p-8 m-4 relative transition-all transform duration-300 ease-in-out ${
          isOpen ? "scale-100 opacity-100" : "scale-90 opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
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
        <div className="max-h-[90vh] overflow-y-auto">
          {" "}
          {/* Added this div */}
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
