"use client";

import { registerConfirmModal } from "@/components/modal/confrim/confirm";
import Modal from "@/components/modal/Modal"; // Adjust path if needed
import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import ModalController from "./ModalController";

const ModalContext = createContext(undefined);

export const useModalContext = () => {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error("useModalContext must be used within a ModalProvider");
  }
  return context;
};

export const ModalProvider = ({ children }) => {
  const [modals, setModals] = useState([]);
  const [modalClosed, setModalClosed] = useState(false); // Still present but seems unused in the example logic

  const openModal = useCallback((modalContent) => {
    setModals((prev) => [...prev, modalContent]);
    setModalClosed(false);
  }, []);

  const closeModal = useCallback(() => {
    // This will close the topmost modal.
    setModals((prev) => prev.slice(0, prev.length - 1));

    // if (modals.length === 1) {
    //   setModalClosed(true);
    // }  // changed on 12.12.2025
    setModalClosed(true);
  }, [modals.length]);

  const value = useMemo(
    () => ({
      modals,
      openModal,
      closeModal,
      modalClosed,
      setModalClosed, // Retain if needed elsewhere for explicit state updates
    }),
    [modals, openModal, closeModal, modalClosed]
  );
  useEffect(() => {
    registerConfirmModal(openModal, closeModal);
  }, [openModal, closeModal]);
  return (
    <ModalContext.Provider value={value}>
      {children}

      {/* RENDER ALL MODALS IN THE STACK, EACH WITH ITS OWN KEY */}
      {modals.map((content, index) => (
        <Modal key={`modal-${index}`} isOpen={true} onClose={closeModal}>
          {content}
        </Modal>
      ))}

      {/* The ModalController is crucial for closing modals on route changes */}
      <Suspense fallback={null}>
        <ModalController />
      </Suspense>
    </ModalContext.Provider>
  );
};
