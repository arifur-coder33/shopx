// // components/ModalButton.js
// "use client";

// import { useModalContext } from "@/context/ModalContext";
// import Modal from "./Modal";

// export default function ModalButton({ children, buttonName }) {
//   // Pass modalContent as a prop
//   const { isOpen, openModal, closeModal, content } = useModalContext();

//   return (
//     <>
//       <button onClick={() => openModal(children)}>{buttonName}</button>
//       <Modal isOpen={isOpen} onClose={closeModal}>
//         {content}
//         {/* Conditionally render content */}
//       </Modal>
//     </>
//   );
// }
"use client";

import { useModalContext } from "@/context/ModalContext new";

export default function ModalButton({ children, buttonName }) {
  const { openModal } = useModalContext();

  return (
    <div className="cursor-pointer" onClick={() => openModal(children)}>
      {buttonName}
    </div>
  );
}
