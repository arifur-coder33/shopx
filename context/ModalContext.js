// contexts/ModalContext.js
"use client";

import { createContext, useContext, useState } from "react";

const ModalContext = createContext();

export const useModalContext = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModalContext must be used within a ModalProvider");
  }
  return context;
};

export const ModalProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState(null); // Store the modal content

  const openModal = (modalContent) => {
    setContent(modalContent);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setContent(null); // Clear the content when closing
  };

  const value = {
    isOpen,
    openModal,
    closeModal,
    content, // Expose the content
  };

  return (
    <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
  );
};
