"use client";
import { getOrderTimeline } from "@/backend/serverActions/orderTimelineActin";
import { useEffect, useState } from "react";
import OrderTimelineView from "./OrderTimeline";

export default function OrderTimelineClient({ orderId, orderNo, phoneNumber }) {
  const [timeline, setTimeline] = useState([]);
  const order = orderId || (orderNo && phoneNumber);
  useEffect(() => {
    async function fetchTimeline() {
      try {
        if (!order) return;
        const response = await getOrderTimeline(orderId, orderNo, phoneNumber);
        // response.data should be array of {status, title, message, createdAt}
        setTimeline(response.data || []);
      } catch (error) {
        console.error("Failed to fetch timeline:", error);
      }
    }

    if (order) fetchTimeline();
  }, [order]);
  if (timeline.length === 0) return;

  return <OrderTimelineView timeline={timeline} />;
}
