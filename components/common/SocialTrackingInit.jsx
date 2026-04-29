"use client";

import { initTrackingCooike } from "@/utils/cookie/initTrackingCooike";
import { useEffect } from "react";

export default function SocialTrackingInit() {
  useEffect(() => {
    initTrackingCooike();
  }, []);

  return null;
}
