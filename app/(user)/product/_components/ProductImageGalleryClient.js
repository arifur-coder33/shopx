// file: app/product/_components/ProductImageGalleryClient.js
"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import styles from "./ProductImageGallery.module.css";

// Lazy-load the full interactive gallery to keep the initial bundle small.
// The JS for this component is only fetched when the user clicks.
const InteractiveGallery = dynamic(() => import("./InteractiveGallery"));

// An overlay to hint to the user that the gallery is interactive
const InteractionPrompt = () => (
  <div className={styles.interactionPrompt}>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zm-7.518-.267A8.25 8.25 0 1120.25 10.5M8.288 14.212A5.25 5.25 0 1117.25 10.5"
      />
    </svg>
    <span>Click to Interact</span>
  </div>
);

export default function ProductImageGalleryClient({ children, ...props }) {
  const [isInteractive, setIsInteractive] = useState(false);

  // If not yet interactive, render the static server content with a click handler
  if (!isInteractive) {
    return (
      <div
        className={styles.staticWrapper}
        onClick={() => setIsInteractive(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) =>
          (e.key === "Enter" || e.key === " ") && setIsInteractive(true)
        }
        aria-label="Activate interactive image gallery"
      >
        {/* Pass the server-rendered gallery through as a child */}
        {children}
        <InteractionPrompt />
      </div>
    );
  }

  // Once clicked, swap to the fully interactive gallery component
  return <InteractiveGallery {...props} />;
}
