"use client";

import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

export function useRealtimeSocket({ enabled = true, getAccessToken, onEvent }) {
  const eventHandler = useRef(onEvent);
  const [status, setStatus] = useState(enabled ? "connecting" : "disabled");
  useEffect(() => { eventHandler.current = onEvent; }, [onEvent]);

  useEffect(() => {
    if (!enabled || !getAccessToken) {
      setStatus("disabled");
      return undefined;
    }

    let disposed = false;
    let unavailable = false;
    const socket = io({
      path: "/api/order-socket/socket.io",
      transports: ["websocket"],
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 15000,
      auth: (callback) => {
        Promise.resolve(getAccessToken()).then((result) => {
          if (disposed) return callback({ token: "" });
          if (!result?.success || !result?.enabled || !result.token) {
            unavailable = true;
            setStatus("unavailable");
            socket.disconnect();
            return callback({ token: "" });
          }
          callback({ token: result.token });
        }).catch(() => callback({ token: "" }));
      },
    });
    socket.on("connect", () => { if (!disposed) setStatus("connecting"); });
    socket.on("disconnect", () => { if (!disposed && !unavailable) setStatus("connecting"); });
    socket.on("realtime:connected", (payload) => {
      if (!disposed) { setStatus("connected"); eventHandler.current?.("realtime:connected", payload); }
    });
    socket.on("realtime:error", () => { if (!disposed) setStatus("connecting"); });
    socket.on("connect_error", (error) => {
      if (disposed || unavailable) return;
      setStatus(error?.message === "Unauthorized" ? "unauthorized" : "connecting");
    });
    socket.onAny((event, payload) => { if (event !== "realtime:connected" && event !== "realtime:error") eventHandler.current?.(event, payload); });
    socket.connect();

    return () => {
      disposed = true;
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [enabled, getAccessToken]);

  return status;
}
