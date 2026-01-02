"use client";
import { updateOrderStatusAction } from "@/backend/serverActions/orderActions";
import { useState } from "react";

export default function OrderFooter({ orderId, status, setStatus }) {
  const [reason, setReason] = useState("");
  const [reasonType, setReasonType] = useState(null); // "cancel" | "return"

  const scrollToCourier = () => {
    const el = document.getElementById("courier");

    if (!el) return;

    el.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    // remove if already exists (re-click safe)
    el.classList.remove("blink-border");

    // force reflow to restart animation
    void el.offsetWidth;

    el.classList.add("blink-border");

    // optional: clean up class after 1s
    setTimeout(() => {
      el.classList.remove("blink-border");
    }, 1000);
  };

  const resetReasonMode = () => {
    setReason("");
    setReasonType(null);
  };

  const confirmReasonAction = () => {
    if (!reason.trim()) return alert("Please write a reason");
    if (!window.confirm("Are you sure?")) return;

    if (reasonType === "cancel") setStatus("CANCELLED");
    if (reasonType === "return") setStatus("RETURNED");

    resetReasonMode();
  };

  const handleStatusChange = async (newStatus) => {
    setStatus(newStatus);
    const response = await updateOrderStatusAction(orderId, newStatus);
  };
  return (
    <div className="fixed bottom-0 left-0 w-full bg-white border-t shadow-lg z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
        {/* STATUS (hidden in reason mode) */}
        {!reasonType && (
          <div className="text-sm font-semibold shrink-0">
            Status:
            <span className="ml-2 px-2 py-1 rounded bg-slate-100">
              {status}
            </span>
          </div>
        )}

        {/* ===== REASON MODE ===== */}
        {reasonType && (
          <>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={`Enter ${reasonType} reason`}
              className="flex-1 px-3 py-2 border rounded"
            />

            <button
              onClick={confirmReasonAction}
              className="px-4 py-2 bg-red-600 text-white rounded"
            >
              Confirm
            </button>

            <button
              onClick={resetReasonMode}
              className="px-4 py-2 bg-gray-300 rounded"
            >
              Back
            </button>
          </>
        )}

        {/* ===== NORMAL MODE ===== */}
        {!reasonType && (
          <div className="flex gap-2 ml-auto flex-wrap">
            {/* PENDING */}
            {status === "PENDING" && (
              <>
                <button
                  onClick={() => handleStatusChange("PROCESSING")}
                  className="px-4 py-2 bg-green-600 text-white rounded"
                >
                  Confirm
                </button>

                <button
                  onClick={() => setReasonType("cancel")}
                  className="px-4 py-2 bg-red-600 text-white rounded"
                >
                  Cancel
                </button>
              </>
            )}

            {/* PROCESSING */}
            {status === "PROCESSING" && (
              <>
                <button
                  onClick={scrollToCourier}
                  className="px-4 py-2 bg-indigo-600 text-white rounded"
                >
                  Select Courier
                </button>

                <button
                  onClick={() => setReasonType("cancel")}
                  className="px-4 py-2 bg-red-600 text-white rounded"
                >
                  Cancel
                </button>
              </>
            )}

            {/* READY TO SHIP */}
            {status === "READY_TO_SHIP" && (
              <button
                onClick={() => handleStatusChange("SHIPPED")}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Shipped
              </button>
            )}

            {/* SHIPPED */}
            {status === "SHIPPED" && (
              <>
                <button
                  onClick={() => handleStatusChange("DELIVERED")}
                  className="px-4 py-2 bg-green-600 text-white rounded"
                >
                  Delivered
                </button>

                <button
                  onClick={() => setReasonType("return")}
                  className="px-4 py-2 bg-orange-600 text-white rounded"
                >
                  Return
                </button>
              </>
            )}

            {/* FINAL */}
            {(status === "DELIVERED" ||
              status === "CANCELLED" ||
              status === "RETURNED") && (
              <button
                disabled
                className="px-4 py-2 bg-gray-300 text-gray-600 rounded"
              >
                No Action
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
