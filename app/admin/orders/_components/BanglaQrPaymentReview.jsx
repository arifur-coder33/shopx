"use client";

import { changeFailedCustomerOrderToCod, reviewBanglaQrPayment } from "@/backend/serverActions/orderActions";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";

export default function BanglaQrPaymentReview({ order, canUpdate }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (!canUpdate) return null;
  const qrPayments = (order?.payments || []).filter((payment) => payment.paymentGateway?.adapterKey === "BANGLA_QR" && payment.status === "PENDING" && payment.transactionId);
  const changeFailedToCod = () => startTransition(async () => {
    const result = await changeFailedCustomerOrderToCod({ orderId: order.id });
    if (!result.success) return toast.error(result.message);
    toast.success(result.message);
    router.refresh();
  });
  const review = (paymentId, approve) => startTransition(async () => {
    const result = await reviewBanglaQrPayment({ paymentId, approve });
    if (!result.success) return toast.error(result.message);
    toast.success(result.message);
    router.refresh();
  });
  if (!qrPayments.length && !(order.status === "PENDING" && order.paymentStatus === "FAILED" && Number(order.paidAmount || 0) <= 0)) return null;
  return <section className="space-y-3 rounded-2xl border border-border bg-surface p-4">
    <h3 className="font-bold">Manual payment review</h3>
    {qrPayments.map((payment) => <div key={payment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3">
      <div><p className="text-sm font-semibold">Bangla QR · ৳{Number(payment.amount).toLocaleString("en-BD")}</p><p className="text-sm text-text-muted">Customer TrxID: <span className="font-mono text-text">{payment.transactionId}</span></p></div>
      <div className="flex gap-2"><button type="button" disabled={pending} onClick={() => review(payment.id, false)} className="rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">Reject</button><button type="button" disabled={pending} onClick={() => review(payment.id, true)} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Confirm payment</button></div>
    </div>)}
    {order.status === "PENDING" && order.paymentStatus === "FAILED" && Number(order.paidAmount || 0) <= 0 && <button type="button" disabled={pending} onClick={changeFailedToCod} className="rounded-lg bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900 disabled:opacity-50">Failed payment → Cash on Delivery</button>}
  </section>;
}
