"use client";

import { useEffect, useRef, useState } from "react";

export function useRealtimeConnection({ enabled = true, getAccessToken, onEvent, subscribeTo }) {
  const eventHandler = useRef(onEvent);
  const [status, setStatus] = useState(enabled ? "connecting" : "disabled");
  useEffect(() => { eventHandler.current = onEvent; }, [onEvent]);

  useEffect(() => {
    if (!enabled || !getAccessToken) {
      setStatus("disabled");
      return undefined;
    }

    let disposed = false;
    let socket;
    let reconnectTimer;
    let reconnectDelay = 1000;
    let permanentlyStopped = false;

    const connect = () => {
      if (disposed || permanentlyStopped) return;
      setStatus("connecting");
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      socket = new WebSocket(protocol + "//" + window.location.host + "/api/order-socket");
      const currentSocket = socket;

      currentSocket.addEventListener("open", async () => {
        try {
          const result = await getAccessToken();
          if (disposed || currentSocket !== socket) return;
          if (!result?.success) {
            permanentlyStopped = true;
            setStatus("unauthorized");
            currentSocket.close(1008, "Unauthorized");
            return;
          }
          if (!result.enabled || !result.token) {
            setStatus("unavailable");
            currentSocket.close(1011, "Realtime disabled");
            return;
          }
          currentSocket.send(JSON.stringify({ type: "auth", token: result.token }));
        } catch {
          setStatus("unavailable");
          currentSocket.close();
        }
      });

      currentSocket.addEventListener("message", (message) => {
        let packet;
        try { packet = JSON.parse(message.data); } catch { return; }
        const { event, payload } = packet || {};
        if (event === "realtime:connected") {
          reconnectDelay = 1000;
          setStatus("connected");
          eventHandler.current?.(event, payload);
          if (subscribeTo && currentSocket.readyState === WebSocket.OPEN) {
            currentSocket.send(JSON.stringify({ type: "subscribe", channel: subscribeTo }));
          }
          return;
        }
        if (event === "realtime:subscribed") {
          setStatus("connected");
          eventHandler.current?.(event, payload);
          return;
        }
        if (event === "realtime:error") {
          if (payload?.code === "unauthorized") {
            permanentlyStopped = true;
            setStatus("unauthorized");
          } else {
            setStatus("unavailable");
          }
          currentSocket.close();
          return;
        }
        if (event === "realtime:channel-error") {
          setStatus("unavailable");
          eventHandler.current?.(event, payload);
          return;
        }
        eventHandler.current?.(event, payload);
      });

      currentSocket.addEventListener("error", () => {
        if (!disposed) setStatus("unavailable");
      });
      currentSocket.addEventListener("close", () => {
        if (disposed || permanentlyStopped) return;
        setStatus("unavailable");
        reconnectTimer = window.setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 15000);
      });
    };

    connect();

    return () => {
      disposed = true;
      permanentlyStopped = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [enabled, getAccessToken, subscribeTo]);

  return status;
}


