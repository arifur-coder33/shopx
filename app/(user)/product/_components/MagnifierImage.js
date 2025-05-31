"use client";
import Imagecustom from "@/components/images/ImageCustom";
import { useState } from "react";

export default function MagnifierImage({
  src,
  zoom = 2,
  w = 400,
  h = 400,
  alt = "image",
}) {
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseEnter = () => {
    setShowMagnifier(true);
  };

  const handleMouseLeave = () => {
    setShowMagnifier(false);
  };

  const handleMouseMove = (e) => {
    const { left, top, width, height } =
      e.currentTarget.getBoundingClientRect();
    const x = ((e.pageX - left - window.scrollX) / width) * 100;
    const y = ((e.pageY - top - window.scrollY) / height) * 100;
    setMousePosition({ x, y });
  };

  return (
    <div
      className="relative overflow-hidden rounded-md"
      style={{ width: w, height: h }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      {/* Use your custom image component here */}
      <Imagecustom
        src={src}
        w={w}
        h={h}
        alt={alt}
        className="w-full h-full object-cover"
        imageClassName="w-full h-full object-cover"
        quality={80}
      />

      {showMagnifier && (
        <div
          className="absolute pointer-events-none border border-gray-300 rounded-md shadow-md z-50"
          style={{
            width: w / zoom,
            height: h / zoom,
            top: `${(mousePosition.y * h) / 100 - h / (2 * zoom)}px`,
            left: `${(mousePosition.x * w) / 100 - w / (2 * zoom)}px`,
            backgroundImage: `url(${src})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: `${w * zoom}px ${h * zoom}px`,
            backgroundPosition: `${mousePosition.x * zoom * -1 + w / 2}px ${
              mousePosition.y * zoom * -1 + h / 2
            }px`,
          }}
        />
      )}
    </div>
  );
}
