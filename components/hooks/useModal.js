// hooks/useModal.js (or similar)

import { useState } from "react";

const useModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);
  const toggleModal = () => setIsOpen((prev) => !prev); // Add a toggle function if needed

  return {
    isOpen,
    openModal,
    closeModal,
    toggleModal, // Optional
  };
};

export default useModal;
