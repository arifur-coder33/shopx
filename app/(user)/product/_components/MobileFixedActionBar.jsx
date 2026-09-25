"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

export default function MobileFixedActionBar({ children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-x-0 bottom-0 z-[60] grid grid-cols-2 gap-2 border-t border-border bg-surface/95 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,23,42,0.14)] backdrop-blur supports-[backdrop-filter]:bg-surface/85 sm:hidden">
      {children}
    </div>,
    document.body,
  );
}
