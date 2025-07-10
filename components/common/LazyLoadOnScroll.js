// file: @/components/common/LazyLoadOnScroll.js
"use client";
import { useEffect, useRef, useState } from "react";
const Placeholder = ({ minHeight = "300px" }) => <div style={{ minHeight }} />;
export default function LazyLoadOnScroll({ children, minHeight }) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref}>
      {isIntersecting ? children : <Placeholder minHeight={minHeight} />}
    </div>
  );
}
