"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const motionClasses = {
  FADE: "hero-motion-fade",
  ZOOM: "hero-motion-zoom",
  SLIDE_LEFT: "hero-motion-slide-left",
  SLIDE_RIGHT: "hero-motion-slide-right",
};

export default function HeroSliderClient({ slides }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [hasChanged, setHasChanged] = useState(false);
  const sliderRef = useRef(null);
  const [canAutoplay, setCanAutoplay] = useState(false);
  const activeSlide = slides[activeIndex] || slides[0];

  useEffect(() => {
    const target = sliderRef.current;
    if (!target || slides.length < 2) return undefined;
    let inView = false;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setCanAutoplay(inView && !document.hidden && !motion.matches);
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      update();
    });
    observer.observe(target);
    document.addEventListener("visibilitychange", update);
    motion.addEventListener("change", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
      motion.removeEventListener("change", update);
    };
  }, [slides.length]);

  useEffect(() => {
    if (slides.length < 2 || !canAutoplay) return undefined;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      const nextIndex = (activeIndex + 1) % slides.length;
      const nextSlide = slides[nextIndex];
      const loader = new window.Image();
      loader.onload = () => {
        if (!cancelled) {
          setHasChanged(true);
          setActiveIndex(nextIndex);
        }
      };
      loader.src = getResponsiveSource(nextSlide);
    }, 5000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeIndex, slides, canAutoplay]);

  const changeSlide = (direction) => {
    const nextIndex = (activeIndex + direction + slides.length) % slides.length;
    const loader = new window.Image();
    loader.onload = () => {
      setHasChanged(true);
      setActiveIndex(nextIndex);
    };
    loader.src = getResponsiveSource(slides[nextIndex]);
  };

  const image = (
    <picture
      key={activeSlide.id}
      className={`block h-full w-full ${hasChanged ? motionClasses[activeSlide.motion] || motionClasses.FADE : ""}`}
    >
      <source media="(max-width: 639px)" srcSet={activeSlide.mobileSrc} />
      <source media="(max-width: 1023px)" srcSet={activeSlide.tabletSrc} />
      <img
        src={activeSlide.desktopSrc}
        width="1280"
        height="500"
        alt={activeSlide.title || "Home slider"}
        loading={activeIndex === 0 ? "eager" : "lazy"}
        fetchPriority={activeIndex === 0 ? "high" : "auto"}
        decoding="async"
        className="h-full w-full object-cover"
      />
    </picture>
  );

  return (
    <section ref={sliderRef} className="group relative aspect-[1280/500] overflow-hidden rounded-md bg-surface-muted" aria-roledescription="carousel" aria-label="Featured offers">
      {activeSlide.link ? <a href={activeSlide.link} aria-label={activeSlide.title || "Open offer"} className="block h-full w-full">{image}</a> : image}

      {slides.length > 1 && (
        <>
          <button type="button" onClick={() => changeSlide(-1)} aria-label="Previous slide" className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white opacity-90 transition hover:bg-black/65 sm:h-12 sm:w-12 sm:opacity-0 sm:group-hover:opacity-100"><ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" /></button>
          <button type="button" onClick={() => changeSlide(1)} aria-label="Next slide" className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white opacity-90 transition hover:bg-black/65 sm:h-12 sm:w-12 sm:opacity-0 sm:group-hover:opacity-100"><ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" /></button>
          <div className="absolute bottom-2 left-1/2 flex max-w-[80%] -translate-x-1/2 gap-0.5 rounded-full bg-black/30 px-1 py-0.5 sm:gap-1.5 sm:px-2 sm:py-1">
            {slides.map((slide, index) => <button key={slide.id} type="button" onClick={() => changeToSlide(index, slide, setHasChanged, setActiveIndex)} aria-label={"Show slide " + (index + 1)} aria-current={index === activeIndex ? "true" : undefined} className="grid h-7 w-7 shrink-0 place-items-center rounded-full sm:h-10 sm:w-10"><span aria-hidden="true" style={{ width: index === activeIndex ? 15 : 6, height: 6, borderRadius: 999, backgroundColor: index === activeIndex ? "#fff" : "rgba(255,255,255,.65)" }} /></button>)}
          </div>
        </>
      )}
    </section>
  );
}

function getResponsiveSource(slide) {
  if (window.matchMedia("(max-width: 639px)").matches) return slide.mobileSrc;
  if (window.matchMedia("(max-width: 1023px)").matches) return slide.tabletSrc;
  return slide.desktopSrc;
}

function changeToSlide(index, slide, setHasChanged, setActiveIndex) {
  const loader = new window.Image();
  loader.onload = () => {
    setHasChanged(true);
    setActiveIndex(index);
  };
  loader.src = getResponsiveSource(slide);
}
