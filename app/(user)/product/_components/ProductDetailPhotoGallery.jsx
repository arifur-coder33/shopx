"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { cloudinaryDetailImage } from "@/utils/cloudinaryUrl";
import DeferredDetailImage from "./DeferredDetailImage";

const MediaViewer = dynamic(() => import("./MobileModalZoomer"), { ssr: false });
const widths = [320, 480, 640, 960, 1200];

export default function ProductDetailPhotoGallery({ photos, title }) {
  const [selection, setSelection] = useState(null);
  const close = useCallback(() => setSelection(null), []);
  const media = photos.map((photo, index) => ({
    id: photo.id || photo.name,
    name: photo.name,
    type: "image",
    alt: photo.seoAlt || `${title} - বিস্তারিত ছবি ${index + 1}`,
  }));

  return <>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {media.map((photo, index) => (
        <button
          type="button"
          key={photo.id}
          aria-label={`পূর্ণ ছবি দেখুন: ${photo.alt}`}
          className="relative aspect-square cursor-zoom-in overflow-hidden rounded-2xl border border-border bg-surface-muted"
          onClick={(event) => setSelection({
            index,
            preview: event.currentTarget.querySelector("img")?.currentSrc,
          })}
        >
          <DeferredDetailImage
            src={cloudinaryDetailImage(photo.name, 640)}
            srcSet={widths.map((width) => `${cloudinaryDetailImage(photo.name, width)} ${width}w`).join(", ")}
            alt={photo.alt}
            width={1200}
            height={1200}
            sizes="(max-width: 640px) calc(100vw - 2rem), (max-width: 1024px) 50vw, 600px"
            className="absolute inset-0 h-full w-full object-contain"
            loading="lazy"
            decoding="async"
            fetchPriority="low"
          />
        </button>
      ))}
    </div>
    {selection && <MediaViewer
      media={media}
      initialIndex={selection.index}
      initialPreview={selection.preview}
      onClose={close}
      backgroundColor="rgba(0, 0, 0, 0.94)"
    />}
  </>;
}
