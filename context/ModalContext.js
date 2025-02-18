// // contexts/ModalContext.js
// "use client";

// import { createContext, useContext, useState } from "react";

// const ModalContext = createContext();

// export const useModalContext = () => {
//   const context = useContext(ModalContext);
//   if (!context) {
//     throw new Error("useModalContext must be used within a ModalProvider");
//   }
//   return context;
// };

// export const ModalProvider = ({ children }) => {
//   const [isOpen, setIsOpen] = useState(false);
//   const [content, setContent] = useState(null); // Store the modal content

//   const openModal = (modalContent) => {
//     setContent(modalContent);
//     setIsOpen(true);
//   };

//   const closeModal = () => {
//     setIsOpen(false);
//     setContent(null); // Clear the content when closing
//   };

//   const value = {
//     isOpen,
//     openModal,
//     closeModal,
//     content, // Expose the content
//   };

//   return (
//     <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
//   );
// };
"use client";

import Modal from "@/components/modal/Modal";
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
  const [modals, setModals] = useState([]);
  const [props, setProps] = useState({});
  const openModal = (modalContent) => {
    setModals((prev) => [...prev, modalContent]); // Push new modal content
  };

  const closeModal = () => {
    setModals((prev) => prev.slice(0, -1)); // Remove the last modal
  };

  return (
    <ModalContext.Provider value={{ modals, openModal, closeModal }}>
      {children}

      {/* Render all modals */}
      {modals.map((content, index) => (
        <Modal key={index} isOpen={true} onClose={closeModal}>
          {content}
        </Modal>
      ))}
    </ModalContext.Provider>
  );
};
