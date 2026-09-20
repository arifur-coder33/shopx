// "use client";
// import {
//   cancelOrderById,
//   updateOrderStatusAction,
// } from "@/backend/serverActions/orderActions";
// import { useState } from "react";
// import { toast } from "react-toastify";

// export default function OrderFooter({ orderId, status, setStatus }) {
//   const [reason, setReason] = useState("");
//   const [reasonType, setReasonType] = useState(null); // "cancel" | "return"

//   const scrollToCourier = () => {
//     const el = document.getElementById("courier");

//     if (!el) return;

//     el.scrollIntoView({
//       behavior: "smooth",
//       block: "start",
//     });

//     // remove if already exists (re-click safe)
//     el.classList.remove("blink-border");

//     // force reflow to restart animation
//     void el.offsetWidth;

//     el.classList.add("blink-border");

//     // optional: clean up class after 1s
//     setTimeout(() => {
//       el.classList.remove("blink-border");
//     }, 1000);
//   };

//   const resetReasonMode = () => {
//     setReason("");
//     setReasonType(null);
//   };
//   console.log("RENDER FOOTER", { status, reasonType });
//   const confirmReasonAction = async () => {
//     if (!reason.trim()) return alert("Please write a reason");
//     if (!window.confirm("Are you sure?")) return;
//     console.log(reasonType);
//     console.log(reason);

//     const response = await cancelOrderById({
//       orderId: orderId,
//       cancelReasonType: reasonType,
//       cancelReason: reason,
//     });
//     if (response.success) {
//       toast.success(`${reasonType} sucess`);
//       if (reasonType === "cancel") {
//         setStatus("CANCELLED");
//       }
//       if (reasonType === "return") setStatus("RETURNED");
//     } else {
//       toast.error("Something went wrong.");
//     }
//     resetReasonMode();
//   };

//   const handleStatusChange = async (newStatus) => {
//     setStatus(newStatus);
//     const response = await updateOrderStatusAction(orderId, newStatus);
//   };
//   return (
//     <div className="fixed bottom-0 left-0 w-full bg-white border-t shadow-lg z-50">
//       <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
//         {/* STATUS (hidden in reason mode) */}
//         {!reasonType && (
//           <div className="text-sm font-semibold shrink-0">
//             Status:
//             <span className="ml-2 px-2 py-1 rounded bg-slate-100">
//               {status}
//             </span>
//           </div>
//         )}

//         {/* ===== REASON MODE ===== */}
//         {reasonType && (
//           <>
//             <input
//               value={reason}
//               onChange={(e) => setReason(e.target.value)}
//               placeholder={`Enter ${reasonType} reason`}
//               className="flex-1 px-3 py-2 border rounded"
//             />

//             <button
//               onClick={confirmReasonAction}
//               className="px-4 py-2 bg-red-600 text-white rounded"
//             >
//               Confirm
//             </button>

//             <button
//               onClick={resetReasonMode}
//               className="px-4 py-2 bg-gray-300 rounded"
//             >
//               Back
//             </button>
//           </>
//         )}

//         {/* ===== NORMAL MODE ===== */}
//         {!reasonType && (
//           <div className="flex gap-2 ml-auto flex-wrap">
//             {/* PENDING */}
//             {status === "PENDING" && (
//               <>
//                 <button
//                   onClick={() => handleStatusChange("PROCESSING")}
//                   className="px-4 py-2 bg-green-600 text-white rounded"
//                 >
//                   Confirm
//                 </button>

//                 <button
//                   onClick={() => setReasonType("cancel")}
//                   className="px-4 py-2 bg-red-600 text-white rounded"
//                 >
//                   Cancel
//                 </button>
//               </>
//             )}

//             {/* PROCESSING */}
//             {status === "PROCESSING" && (
//               <>
//                 <button
//                   onClick={scrollToCourier}
//                   className="px-4 py-2 bg-indigo-600 text-white rounded"
//                 >
//                   Select Courier
//                 </button>

//                 <button
//                   onClick={() => setReasonType("cancel")}
//                   className="px-4 py-2 bg-red-600 text-white rounded"
//                 >
//                   Cancel
//                 </button>
//               </>
//             )}

//             {/* READY TO SHIP */}
//             {status === "READY_TO_SHIP" && (
//               <button
//                 onClick={() => handleStatusChange("SHIPPED")}
//                 className="px-4 py-2 bg-blue-600 text-white rounded"
//               >
//                 Make as Shipped
//               </button>
//             )}

//             {/* SHIPPED */}
//             {status === "SHIPPED" && (
//               <>
//                 <button
//                   onClick={() => handleStatusChange("DELIVERED")}
//                   className="px-4 py-2 bg-green-600 text-white rounded"
//                 >
//                   Make as Delivered
//                 </button>

//                 <button
//                   onClick={() => setReasonType("return")}
//                   className="px-4 py-2 bg-orange-600 text-white rounded"
//                 >
//                   Mark as Return
//                 </button>
//               </>
//             )}

//             {/* FINAL */}
//             {(status === "DELIVERED" ||
//               status === "CANCELLED" ||
//               status === "RETURNED") && (
//               <button
//                 disabled
//                 className="px-4 py-2 bg-gray-300 text-gray-600 rounded"
//               >
//                 No Action
//               </button>
//             )}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

"use client";
import {
  cancelOrderById,
  processRefundAction,
  updateOrderStatusAction,
} from "@/backend/serverActions/orderActions";
import { getOrderTimeline } from "@/backend/serverActions/orderTimelineActin";
import { confirmFromUser } from "@/components/modal/confrim/confirm";
import Link from "next/link";
import { useState } from "react";
import { toast } from "react-toastify";

export default function OrderFooter({ orderId, status, setStatus, payments = [], createdAt }) {
  const [reason, setReason] = useState("");
  const [reasonType, setReasonType] = useState(null);
  const [loading, setLoading] = useState(false);

  const [refundData, setRefundData] = useState({
    trxId: "",
    note: "",
  });
  const refundablePayments = payments.filter((payment) =>
    ["PAID", "PARTIALLY_REFUNDED"].includes(payment.status),
  );
  const refundAccount = refundablePayments.length === 1 ? refundablePayments[0].moneyAccount : null;

  // ✅ 30 days return check
  const isReturnAvailable = async () => {
    const getStatus = await getOrderTimeline(orderId);
    const lastStatus = getStatus?.data?.[0];

    if (lastStatus?.status !== "DELIVERED") return false;

    const deliveryData = new Date(lastStatus.createdAt);
    const now = new Date();
    const diffDays = (now - deliveryData) / (1000 * 60 * 60 * 24);
    return diffDays <= 30;
  };

  const resetReasonMode = () => {
    setReason("");
    setReasonType(null);
  };

  // ✅ Safe Status Update
  const handleStatusChange = async (newStatus) => {
    const ok = await confirmFromUser({
      title: "Confirm Update",
      message: "Do you want to update the order status to " + newStatus + "?",
    });
    if (!ok) return;
    try {
      setLoading(true);

      const res = await updateOrderStatusAction(orderId, newStatus);

      if (!res?.success) throw new Error(res.message);

      setStatus(newStatus);
      toast.success("Status updated");
    } catch (err) {
      toast.error(err.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

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

  // ✅ Cancel / Return with reason
  const confirmReasonAction = async () => {
    if (!reason.trim()) return alert("Write reason");
    if (!window.confirm("Are you sure?")) return;

    try {
      setLoading(true);

      const res = await cancelOrderById({
        orderId,
        cancelReasonType: reasonType,
        cancelReason: reason,
      });

      if (!res.success) throw new Error(res.message);

      if (reasonType === "cancel") setStatus("CANCELLED");
      if (reasonType === "return") setStatus("RETURNED");
      if (reasonType === "failed_delivery") setStatus("CANCELLED");

      toast.success(`${reasonType} success`);
      resetReasonMode();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Refund process
  const handleRefund = async () => {
    try {
      setLoading(true);

      const res = await processRefundAction({
        orderId,
        ...refundData,
      });

      if (!res.success) throw new Error(res.message);

      setStatus("REFUNDED");
      toast.success("Refund completed");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 w-full bg-white border-t shadow-lg z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
        {/* STATUS */}
        {!reasonType && (
          <div className="text-sm font-semibold">
            Status:
            <span className="ml-2 px-2 py-1 rounded bg-slate-100">
              {status}
            </span>
          </div>
        )}

        {/* ===== REASON INPUT ===== */}
        {reasonType && (
          <>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={`Enter ${reasonType} reason`}
              className="flex-1 px-3 py-2 border rounded"
            />

            <button
              disabled={loading}
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

        {/* ===== REFUND INPUT ===== */}
        {status === "REFUNDING" && (
          <>
            <span className="text-sm text-slate-700">
              {refundAccount
                ? `Refund from original account: ${refundAccount.name}`
                : "A single posted payment with an account is required. Use the per-payment refund workflow otherwise."}
            </span>

            <input
              placeholder="External refund reference (optional)"
              onChange={(e) =>
                setRefundData({ ...refundData, trxId: e.target.value })
              }
              className="border px-2 py-1"
            />
            <input
              placeholder="Refund note (optional)"
              onChange={(e) =>
                setRefundData({ ...refundData, note: e.target.value })
              }
              className="border px-2 py-1"
            />
            <button
              disabled={loading || !refundAccount}
              onClick={handleRefund}
              className={`px-4 py-2 bg-green-700 text-white rounded ${!refundAccount ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              Confirm Refund
            </button>
          </>
        )}

        {/* ===== ACTION BUTTONS ===== */}
        {!reasonType && status !== "REFUNDING" && (
          <div className="flex gap-2 ml-auto flex-wrap">
            {/* PENDING */}
            {status === "PENDING" && (
              <>
                <button
                  disabled={loading}
                  onClick={scrollToCourier}
                  className="px-4 py-2 bg-green-600 text-white rounded"
                >
                  Confirm & Create Courier
                </button>

                <button
                  onClick={() => setReasonType("cancel")}
                  className="px-4 py-2 bg-red-600 text-white rounded"
                >
                  Cancel Order
                </button>
              </>
            )}
            {/* PROCESSING */}

            {status === "PROCESSING" && (
              <>
                <Link
                  href="/admin/procurement/deliveries"
                  className="px-4 py-2 bg-indigo-600 text-white rounded"
                >
                  Open Delivery Queue
                </Link>

                <button
                  onClick={() => setReasonType("cancel")}
                  className="px-4 py-2 bg-red-600 text-white rounded"
                >
                  Cancel Order
                </button>
              </>
            )}

            {/* Ready to Ship */}
            {status === "READY_TO_SHIP" && (
              <>
                <button
                  onClick={() => handleStatusChange("SHIPPED")}
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                  Mark as Shipped
                </button>

                <button
                  onClick={() => setReasonType("cancel")}
                  className="px-4 py-2 bg-red-600 text-white rounded"
                >
                  Cancel order
                </button>
              </>
            )}
            {/* SHIPPED */}
            {status === "SHIPPED" && (
              <>
                <button
                  onClick={() => handleStatusChange("DELIVERED")}
                  className="px-4 py-2 bg-green-600 text-white rounded"
                >
                  Mark as Delivered
                </button>

                <button
                  onClick={() => handleStatusChange("DELIVERY_FAILED")}
                  className="px-4 py-2 bg-red-600 text-white rounded"
                >
                  Delivery Failed
                </button>
              </>
            )}
            {/* DELIVERY FAILED */}
            {status === "DELIVERY_FAILED" && (
              <>
                <button
                  onClick={() => handleStatusChange("FAILED_RETURNING")}
                  className="px-4 py-2 bg-orange-500 text-white rounded"
                >
                  Returning
                </button>

                <button
                  onClick={() => handleStatusChange("CANCELLED")}
                  className="px-4 py-2 bg-gray-600 text-white rounded"
                >
                  Close Order
                </button>
              </>
            )}
            {/* FAILED RETURNING */}
            {status === "FAILED_RETURNING" && (
              <button
                onClick={() => handleStatusChange("FAILED_RETURN_RECEIVED")}
                className="px-4 py-2 bg-yellow-600 text-white rounded"
              >
                Return Received
              </button>
            )}
            {/* FAILED RETURN RECEIVED */}
            {status === "FAILED_RETURN_RECEIVED" && (
              <>
                <button
                  onClick={() => handleStatusChange("READY_TO_SHIP")}
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                  Resend
                </button>

                <button
                  onClick={() => setReasonType("failed_delivery")}
                  className="px-4 py-2 bg-gray-700 text-white rounded"
                >
                  Cancel Order
                </button>
              </>
            )}
            {/* DELIVERED */}
            {status === "DELIVERED" && isReturnAvailable() && (
              <>
                <button
                  onClick={() => handleStatusChange("RETURNING")}
                  className="px-4 py-2 bg-orange-500 text-white rounded"
                >
                  Returning
                </button>

                <button
                  onClick={() => setReasonType("return")}
                  className="px-4 py-2 bg-yellow-600 text-white rounded"
                >
                  Returned
                </button>
              </>
            )}
            {/* RETURNING */}
            {status === "RETURNING" && (
              <>
                <button
                  onClick={() => handleStatusChange("RETURNED")}
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                  Mark as Returned
                </button>
              </>
            )}
            {/* RETURNED */}
            {status === "RETURNED" && (
              <>
                <button
                  onClick={() => handleStatusChange("REFUNDING")}
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                  Approve Refund
                </button>

                <button
                  onClick={() => handleStatusChange("DELIVERED")}
                  className="px-4 py-2 bg-red-600 text-white rounded"
                >
                  Deny Return
                </button>
              </>
            )}
            {/* FINAL */}
            {(status === "REFUNDED" || status === "CANCELLED") && (
              <button className="px-4 py-2 bg-gray-300 text-gray-600 rounded">
                No Action
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
