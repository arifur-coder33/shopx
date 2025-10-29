// src/context/ModalController.js (Create this new file)
"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { useModalContext } from "./ModalContext new"; // Import your context hook

export default function ModalController() {
  // Get the closeModal function from your existing context
  const { closeModal } = useModalContext();

  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Memoize the full URL to use as a stable dependency
  const fullUrl = useMemo(() => {
    return `${pathname}?${searchParams.toString()}`;
  }, [pathname, searchParams]);

  // Use a ref to track if this is the initial render
  const isInitialRender = useRef(true);

  useEffect(() => {
    // On the very first render of this component, don't do anything.
    // This prevents the modal from closing if it's supposed to be open
    // on page load (e.g., from a URL parameter).
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }

    // On subsequent renders (which are caused by URL changes), close the modal.
    // console.log("URL changed, ModalController is closing modal.");
    closeModal();

    // We only want this to run when the URL changes.
    // We disable the eslint warning because closeModal is stable via useCallback in the provider,
    // but including it could cause loops if not memoized correctly. fullUrl is the true trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullUrl]);

  // This component renders nothing.
  return null;
}
