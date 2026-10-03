"use client";

import { useCallback, useEffect, useRef, useState } from "react";

let interactiveModule;
function loadInteractiveModule() {
  interactiveModule ||= import("./ProductInteractiveShell").catch((error) => {
    interactiveModule = undefined;
    throw error;
  });
  return interactiveModule;
}

// Only this small gate hydrates initially. Image and price remain server slots.
export default function ProductClientShell({ initialContent, ...props }) {
  const [InteractiveShell, setInteractiveShell] = useState(null);
  const [initialIntent, setInitialIntent] = useState({});
  const mounted = useRef(false);
  const activate = useCallback(() => {
    loadInteractiveModule()
      .then((module) => {
        if (mounted.current) setInteractiveShell(() => module.default);
      })
      .catch(() => {
        // A later interaction retries a failed chunk request.
      });
  }, []);

  useEffect(() => {
    mounted.current = true;
    let idleId;
    let timer;
    const schedule = () => {
      if ("requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(activate, { timeout: 800 });
      } else {
        timer = window.setTimeout(activate, 50);
      }
    };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });
    return () => {
      mounted.current = false;
      window.removeEventListener("load", schedule);
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
      window.clearTimeout(timer);
    };
  }, [activate]);

  const handleIntent = (event) => {
    const button = event.target.closest("[data-product-media], [data-product-option]");
    if (button?.dataset.productMedia) {
      setInitialIntent({ mediaId: button.dataset.productMedia });
    } else if (button?.dataset.productOption) {
      setInitialIntent({ options: { [button.dataset.productOption]: button.dataset.productValue } });
    }
    activate();
  };
  if (InteractiveShell) return <InteractiveShell key={props.data.id} {...props} initialIntent={initialIntent} />;
  return (
    <div className="contents" onFocusCapture={activate} onClick={handleIntent}>
      {initialContent}
    </div>
  );
}
