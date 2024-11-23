"use client";

import { MoveLeft } from "lucide-react";

export default function BackButton() {
  return (
    <button
      className="absolute top-2 left-2"
      onClick={() => window.history.back()}
    >
      <MoveLeft />
    </button>
  );
}
