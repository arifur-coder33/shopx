// src/hooks/useMounted.js
"use client";

import { useEffect, useState } from "react";

// This hook returns `true` only after the component has mounted on the client.
export function useMounted() {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  return hasMounted;
}
