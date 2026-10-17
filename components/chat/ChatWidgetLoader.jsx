"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const ChatWidget = dynamic(() => import("./WebsiteChatWidget"), { ssr: false });

export default function ChatWidgetLoader() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let timer;
    const show = () => setReady(true);
    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(show, { timeout: 2500 });
      return () => window.cancelIdleCallback(idleId);
    }
    timer = window.setTimeout(show, 1800);
    return () => window.clearTimeout(timer);
  }, []);
  return ready ? <ChatWidget /> : null;
}
