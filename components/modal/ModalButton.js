"use client";

import useModal from "../hooks/useModal";
import Modal from "./Modal";

export default function ModalButton({ children }) {
  const { isOpen, openModal, closeModal } = useModal();

  return (
    <div>
      <button onClick={openModal}>Open Modal</button>
      <Modal isOpen={isOpen} onClose={closeModal}>
        {/* Modal content for Page 1 */}
        {children}
      </Modal>
    </div>
  );
}
