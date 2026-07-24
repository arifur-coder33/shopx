"use client";
import { getOrderTimeline } from "@/backend/serverActions/orderTimelineActin";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Package,
  RefreshCcw,
  RotateCcw,
  Truck,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

// Status config with icons & colors
export const statusConfig = {
  PENDING: { icon: Clock, color: "text-yellow-500 bg-yellow-100" },
  PROCESSING: { icon: Package, color: "text-blue-500 bg-blue-100" },
  READY_TO_SHIP: { icon: Package, color: "text-indigo-500 bg-indigo-100" },
  SHIPPED: { icon: Truck, color: "text-purple-500 bg-purple-100" },
  DELIVERED: { icon: CheckCircle, color: "text-green-500 bg-green-100" },
  CANCELLED: { icon: XCircle, color: "text-red-500 bg-red-100" },
  DELIVERY_FAILED: {
    icon: AlertTriangle,
    color: "text-orange-500 bg-orange-100",
  },
  FAILED_RETURNING: { icon: RotateCcw, color: "text-pink-500 bg-pink-100" },
  RETURNING: { icon: RotateCcw, color: "text-pink-600 bg-pink-100" },
  RETURN_RECEIVED: { icon: RotateCcw, color: "text-pink-700 bg-pink-100" },
  RETURNED: { icon: RotateCcw, color: "text-pink-800 bg-pink-100" },
  REFUNDING: { icon: RefreshCcw, color: "text-cyan-500 bg-cyan-100" },
  REFUNDED: { icon: DollarSign, color: "text-green-600 bg-green-100" },
};

export default function OrderTimelineNew({ orderId, orderNo, phoneNumber }) {
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

  // Format date/time
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
      d.getMinutes(),
    ).padStart(2, "0")}`;
  };

  return (
    <div className="card ">
      <h3 className="font-semibold text-slate-800 mb-6">
        Order Tracking {timeline.length}
      </h3>

      <div className="relative">
        {/* vertical line */}
        <div className="absolute left-5 top-0 bottom-0 w-[2px] bg-slate-200"></div>

        <div className="space-y-6">
          {timeline.map((item, idx) => {
            const config = statusConfig[item.status];
            const Icon = config?.icon || Package;

            return (
              <div key={idx} className="relative flex items-start gap-4">
                {/* icon */}
                <div
                  className={`z-10 flex items-center justify-center w-10 h-10 rounded-full ${config?.color}`}
                >
                  <Icon size={18} />
                </div>

                {/* content */}
                <div className="flex-1">
                  {/* status + time */}
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm text-slate-800">
                      {item.title}
                    </h4>
                    <span className="text-xs text-slate-400">
                      {formatDate(item.createdAt)}
                    </span>
                  </div>

                  {/* message */}
                  <p className="text-sm text-slate-500 mt-1">{item.message}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* delivery progress */}
        {/* <div className="mt-8">
          <div className="flex justify-between text-xs text-slate-500 mb-2">
            <span>Delivery Progress</span>
            <span>{timeline.length} Updates</span>
          </div>

          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{
                width: `${(timeline.length / 10) * 100}%`, // assuming max 10 updates
              }}
            ></div>
          </div>
        </div> */}
      </div>
    </div>
  );
}
