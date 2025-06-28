"use client";
import {
  FloatingPortal,
  arrow,
  useFloating,
  useHover,
  useInteractions,
} from "@floating-ui/react";
import React, { useState } from "react";
export default function Tooltip({ children, content }) {
  const [isOpen, setIsOpen] = useState(false);
  const arrowRef = React.useRef(null);

  const { x, y, strategy, refs, context } = useFloating({
    placement: "top",
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [
      arrow({
        element: arrowRef,
      }),
    ],
  });

  const hover = useHover(context, { move: false });
  const { getReferenceProps, getFloatingProps } = useInteractions([hover]);

  // If there's no content, don't wrap the children
  if (!content) {
    return <>{children}</>;
  }

  return (
    <>
      <div ref={refs.setReference} {...getReferenceProps()}>
        {children}
      </div>
      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={{ position: strategy, top: y ?? 0, left: x ?? 0 }}
            className="bg-gray-800 text-white text-xs font-semibold rounded-md px-2 py-1 z-50"
            {...getFloatingProps()}
          >
            {content}
            <div
              ref={arrowRef}
              className="absolute bg-gray-800 h-[8px] w-[8px] rotate-45"
              style={{
                left: context.middlewareData.arrow?.x,
                top: context.middlewareData.arrow?.y,
                right: "",
                bottom: "-4px", // Position the arrow at the bottom of the tooltip
              }}
            />
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
