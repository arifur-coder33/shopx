"use client";

import React, { useMemo } from "react";
import styles from "./ProductImageGallery.module.css";

export default React.memo(function VideoPlayer({ url, alt, isMuted = false }) {
  const videoInfo = useMemo(() => {
    try {
      const urlObject = new URL(url);
      if (
        urlObject.hostname.includes("youtube.com") ||
        urlObject.hostname.includes("youtu.be")
      ) {
        const videoId =
          urlObject.searchParams.get("v") ||
          urlObject.pathname.split("/").pop();
        return { type: "youtube", id: videoId };
      }
      if (urlObject.hostname.includes("vimeo.com")) {
        const videoId = urlObject.pathname.split("/").pop();
        return { type: "vimeo", id: videoId };
      }
      if (
        urlObject.pathname.endsWith(".mp4") ||
        urlObject.pathname.endsWith(".webm") ||
        urlObject.pathname.endsWith(".ogg")
      ) {
        return { type: "html5", src: url };
      }
    } catch (error) {
      if (
        url.endsWith(".mp4") ||
        url.endsWith(".webm") ||
        url.endsWith(".ogg")
      ) {
        return { type: "html5", src: url };
      }
    }
    return { type: "unknown", src: url };
  }, [url]);

  const renderPlayer = () => {
    switch (videoInfo.type) {
      case "youtube":
        return (
          <>
            <iframe
              // We add a specific class ONLY to the YouTube player
              className={styles.youtubePlayer}
              // The `controls=1` parameter is essential for showing the bottom bar
              src={`https://www.youtube.com/embed/${videoInfo.id}?autoplay=1&mute=0&loop=1&rel=0&controls=1&playlist=${videoInfo.id}`}
              title={alt}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
            <div className={styles.youtubeControlsOverlay}></div>
          </>
        );
      case "vimeo":
        return (
          <iframe
            src={`https://player.vimeo.com/video/${
              videoInfo.id
            }?autoplay=1&muted=${isMuted ? 1 : 0}&loop=1&autopause=0&dnt=1`}
            title={alt}
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          ></iframe>
        );
      case "html5":
        return (
          <video
            src={videoInfo.src}
            controls
            autoPlay
            muted={isMuted}
            loop
            playsInline
          >
            Your browser does not support the video tag.
          </video>
        );
      default:
        return (
          <iframe
            src={videoInfo.src}
            title={alt}
            frameBorder="0"
            allow="autoplay; fullscreen"
            allowFullScreen
          ></iframe>
        );
    }
  };

  return <div className={styles.videoWrapper}>{renderPlayer()}</div>;
});
