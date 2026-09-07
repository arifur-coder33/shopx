"use client";

import { retryCustomerOrderPayment } from "@/backend/serverActions/paymentInitiationAction";
import { cancelUnpaidCustomerOrder } from "@/backend/serverActions/orderActions";
import { Ban, CreditCard, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "react-toastify";
import PaymentMethodSelector from "../checkout/PaymentMethodSelector";

const blockedPaymentStatuses = new Set([
  "PAID",
  "PARTIALLY_PAID",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
]);

export default function OrderPaymentRecovery({ order, onChanged }) {
  const router = useRouter();
  const [localOrder, setLocalOrder] = useState(order);
  const [paymentSelection, setPaymentSelection] = useState(null);
  const [showMethods, setShowMethods] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [pending, startTransition] = useTransition();

  const canManage = useMemo(
    () =>
      localOrder?.status === "PENDING" &&
      Number(localOrder?.paidAmount || 0) <= 0 &&
      Number(localOrder?.dueAmount || 0) > 0 &&
      !blockedPaymentStatuses.has(localOrder?.paymentStatus),
    [localOrder],
  );

  if (!localOrder) return null;

  const applyLocalChange = (changes) => {
    const next = { ...localOrder, ...changes };
    setLocalOrder(next);
    onChanged?.(next);
  };

  const startPayment = () => {
    if (!paymentSelection) {
      toast.error("একটি পেমেন্ট মেথড নির্বাচন করুন।");
      return;
    }
    startTransition(async () => {
      const result = await retryCustomerOrderPayment({
        orderNo: localOrder.orderNo,
        phoneNumber: localOrder.phoneNumber,
        ...paymentSelection,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      if (result.url) {
        window.location.assign(result.url);
        return;
      }
      applyLocalChange({ paymentMethod: "COD", paymentStatus: "PENDING" });
      setShowMethods(false);
      setPaymentSelection(null);
      toast.success(result.message);
      router.refresh();
    });
  };

  const cancelOrder = () => {
    startTransition(async () => {
      const result = await cancelUnpaidCustomerOrder({
        orderNo: localOrder.orderNo,
        phoneNumber: localOrder.phoneNumber,
        reason: cancelReason,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      applyLocalChange({ status: "CANCELLED", paymentStatus: "CANCELLED" });
      setShowCancel(false);
      setShowMethods(false);
      toast.success(result.message);
      router.refresh();
    });
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-900">পেমেন্ট</h3>
          <p className="text-sm text-slate-500">
            স্ট্যাটাস: <span className="font-semibold">{localOrder.paymentStatus}</span>
            {localOrder.paymentMethod && <> · {localOrder.paymentMethod}</>}
          </p>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setShowMethods((value) => !value);
                setShowCancel(false);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              <CreditCard className="h-4 w-4" /> আবার পেমেন্ট করুন
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setShowCancel((value) => !value);
                setShowMethods(false);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 disabled:opacity-50"
            >
              <Ban className="h-4 w-4" /> অর্ডার বাতিল করুন
            </button>
          </div>
        )}
      </div>

      {localOrder.status === "CANCELLED" && (
        <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          এই অর্ডারটি বাতিল করা হয়েছে। নতুন পেমেন্ট করা যাবে না।
        </p>
      )}

      {showMethods && canManage && (
        <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
          <PaymentMethodSelector setPaymentSelection={setPaymentSelection} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setShowMethods(false);
                setPaymentSelection(null);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2"
            >
              <X className="h-4 w-4" /> এখন নয়
            </button>
            <button
              type="button"
              disabled={pending || !paymentSelection}
              onClick={startPayment}
              className="rounded-xl bg-emerald-600 px-5 py-2 font-semibold text-white disabled:opacity-50"
            >
              {pending ? "প্রসেস হচ্ছে…" : "পেমেন্ট নিশ্চিত করুন"}
            </button>
          </div>
        </div>
      )}

      {showCancel && canManage && (
        <div className="mt-4 space-y-3 border-t border-red-100 pt-4">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            বাতিল করার কারণ (ঐচ্ছিক)
            <textarea
              rows={3}
              maxLength={500}
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              className="rounded-xl border border-slate-300 p-3 font-normal outline-none focus:border-red-400"
              placeholder="কেন অর্ডারটি বাতিল করছেন?"
            />
          </label>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={pending}
              onClick={() => setShowCancel(false)}
              className="rounded-xl border border-slate-300 px-4 py-2"
            >
              ফিরে যান
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={cancelOrder}
              className="rounded-xl bg-red-600 px-5 py-2 font-semibold text-white disabled:opacity-50"
            >
              {pending ? "বাতিল হচ্ছে…" : "অর্ডার বাতিল নিশ্চিত করুন"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
