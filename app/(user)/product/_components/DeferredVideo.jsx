"use client";

import Image from "next/image";
import { Play } from "lucide-react";
import { useState } from "react";

function withAutoplay(src) {
  try {
    const url = new URL(src);
    url.searchParams.set("autoplay", "1");
    return url.toString();
  } catch {
    return src;
  }
}

/**
 * Keeps third-party video players out of the initial page request.
 * YouTube/Vimeo scripts are downloaded only after the customer presses play.
 */
export default function DeferredVideo({ source, title, poster }) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    if (source.type === "file") {
      return (
        <video
          className="h-full w-full"
          src={source.src}
          controls
          autoPlay
          preload="metadata"
          playsInline
          poster={poster}
        >
          আপনার ব্রাউজার ভিডিওটি চালাতে পারছে না।
        </video>
      );
    }

    return (
      <iframe
        className="h-full w-full border-0"
        src={withAutoplay(source.src)}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    );
  }

  return (
    <button
      type="button"
      className="group relative h-full w-full overflow-hidden bg-neutral-950 text-white"
      onClick={() => setPlaying(true)}
      aria-label={`${title} চালান`}
    >
      {poster ? (
        <Image
          src={poster}
          alt=""
          fill
          sizes="(max-width: 1024px) 100vw, 1024px"
          className="object-cover opacity-70 transition-transform duration-500 group-hover:scale-[1.02]"
          loading="lazy"
          unoptimized
        />
      ) : (
        <span className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-black" />
      )}
      <span className="absolute inset-0 bg-black/25" />
      <span className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform group-hover:scale-105">
          <Play className="ml-0.5 h-6 w-6 fill-current" aria-hidden="true" />
        </span>
        <span className="rounded-full bg-black/55 px-3 py-1 text-sm font-semibold backdrop-blur-sm">
          ভিডিও চালান
        </span>
      </span>
    </button>
  );
}
