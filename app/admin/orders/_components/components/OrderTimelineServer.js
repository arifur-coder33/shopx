import { getOrderTimeline } from "@/backend/serverActions/orderTimelineActin";
import OrderTimelineView from "./OrderTimeline";

export default async function OrderTimelineServer({ orderId }) {
  if (!orderId) return null;

  const timeline = await getOrderTimeline(orderId); // server fetch

  return <OrderTimelineView timeline={timeline.data || []} />;
}
