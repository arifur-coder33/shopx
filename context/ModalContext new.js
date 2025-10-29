// src/context/ModalContext.js (Update this file)
"use client";

import Modal from "@/components/modal/Modal"; // Adjust path if needed
import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import ModalController from "./ModalController"; // 2. Import the new controller

const ModalContext = createContext(undefined); // Initialize with undefined for better error checking

export const useModalContext = () => {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error("useModalContext must be used within a ModalProvider");
  }
  return context;
};

export const ModalProvider = ({ children }) => {
  const [modals, setModals] = useState([]);
  // props and modalClosed states seem unused in the provided logic, can be removed if not needed elsewhere
  // const [props, setProps] = useState({});
  const [modalClosed, setModalClosed] = useState(false);

  // 3. REMOVE the route-watching logic from here
  // const pathname = usePathname();
  // const searchParams = useSearchParams();
  // const fullUrl = useMemo(...);
  // useEffect(...);

  const openModal = useCallback((modalContent) => {
    setModals((prev) => [...prev, modalContent]);
    setModalClosed(false);
  }, []);

  const closeModal = useCallback(() => {
    // This will close all modals. If you want to close one at a time:
    setModals((prev) => prev.slice(0, prev.length - 1)); // Closes the topmost modal
    // If you intend to close ALL modals on route change, this is what you want:
    // setModals([]);
  }, []);

  const value = useMemo(
    () => ({
      modals,
      openModal,
      closeModal,
      setModalClosed,
    }),
    [modals, openModal, closeModal]
  );

  return (
    <ModalContext.Provider value={value}>
      {children}

      {/* Render the topmost modal */}
      {/* We only render the last modal in the stack for simplicity,
          or you can render them all with z-index logic if you need stacked visuals.
          Rendering only the top one is more performant. */}
      {modals.length > 0 && (
        <Modal isOpen={true} onClose={closeModal}>
          {modals[modals.length - 1]}
        </Modal>
      )}

      {/* 4. Add the Suspense boundary and the controller here */}
      <Suspense fallback={null}>
        <ModalController />
      </Suspense>
    </ModalContext.Provider>
  );
};
