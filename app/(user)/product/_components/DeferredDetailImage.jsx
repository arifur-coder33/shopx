"use client";

import { useEffect, useRef, useState } from "react";

export default function DeferredDetailImage({ src, srcSet, ...props }) {
  const imageRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = imageRef.current;
    if (!element) return;
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "200px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <img {...props} ref={imageRef} style={{ visibility: visible ? "visible" : "hidden" }} src={visible ? src : undefined} srcSet={visible ? srcSet : undefined} />
      <noscript><img {...props} src={src} srcSet={srcSet} /></noscript>
    </>
  );
}
