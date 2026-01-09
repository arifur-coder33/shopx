// components/confirm/confirm.js
"use client";

import ConfirmContent from "./ConfirmContent";

/**
 * This is NOT a hook
 * It uses window-scoped bridge to ModalContext
 */

let openModalRef = null;
let closeModalRef = null;

export function registerConfirmModal(openModal, closeModal) {
  openModalRef = openModal;
  closeModalRef = closeModal;
}

export function confirmFromUser({ title, message }) {
  return new Promise((resolve) => {
    if (!openModalRef || !closeModalRef) {
      throw new Error("Confirm modal is not registered");
    }

    const handleConfirm = () => {
      closeModalRef();
      resolve(true);
    };

    const handleCancel = () => {
      closeModalRef();
      resolve(false);
    };

    openModalRef(
      <ConfirmContent
        title={title}
        message={message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );
  });
}
