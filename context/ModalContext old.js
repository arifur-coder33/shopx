"use client";
import Modal from "@/components/modal/Modal";
import { usePathname, useSearchParams } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

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
  const [modalClosed, setModalClosed] = useState(false);

  const pathname = usePathname();
  const searchParams = useSearchParams();

  const fullUrl = useMemo(() => {
    return `${pathname}?${searchParams.toString()}`;
  }, [pathname, searchParams]);

  useEffect(() => {
    closeModal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullUrl]);

  const openModal = (modalContent) => {
    setModals((prev) => [...prev, modalContent]); // Push new modal content
    setModalClosed(false); // When opening, reset
  };

  const closeModal = () => {
    setModals((prev) => prev.slice(0, -1)); // Remove the last modal
    setModalClosed(true); // ✅ When closing, trigger
  };

  return (
    <ModalContext.Provider
      value={{ modals, openModal, closeModal, modalClosed, setModalClosed }}
    >
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
