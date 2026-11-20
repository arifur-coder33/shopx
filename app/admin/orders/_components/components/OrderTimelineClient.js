"use client";
import { getOrderTimeline } from "@/backend/serverActions/orderTimelineActin";
import { useEffect, useState } from "react";
import OrderTimelineView from "./OrderTimeline";

export default function OrderTimelineClient({ orderId, orderNo, phoneNumber }) {
  const [timeline, setTimeline] = useState([]);
  const order = orderId || (orderNo && phoneNumber);
  useEffect(() => {
    let active = true;
    let fetching = false;
    async function fetchTimeline() {
      if (!order || fetching) return;
      fetching = true;
      try {
        const response = await getOrderTimeline(orderId, orderNo, phoneNumber);
        if (active) setTimeline(response.data || []);
      } catch (error) {
        console.error("Failed to fetch timeline:", error);
      } finally {
        fetching = false;
      }
    }

    fetchTimeline();
    const refreshWhileVisible = () => {
      if (document.visibilityState === "visible") fetchTimeline();
    };
    const interval = window.setInterval(refreshWhileVisible, 30000);
    window.addEventListener("focus", refreshWhileVisible);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshWhileVisible);
    };
  }, [orderId, orderNo, phoneNumber, order]);
  if (timeline.length === 0) return;

  return <OrderTimelineView timeline={timeline} />;
}
