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
  const review = (paymentId, approve, amountReceived) => startTransition(async () => {
    const result = await reviewBanglaQrPayment({ paymentId, approve, amountReceived });
    if (!result.success) return toast.error(result.message);
    toast.success(result.message);
    router.refresh();
  });
  if (!qrPayments.length && !(order.status === "PENDING" && order.paymentStatus === "FAILED" && Number(order.paidAmount || 0) <= 0)) return null;
  return <section className="space-y-3 rounded-2xl border border-border bg-surface p-4">
    <h3 className="font-bold">Manual payment review</h3>
    {qrPayments.map((payment) => <BanglaQrPaymentRow key={payment.id} payment={payment} maxAmount={order.dueAmount} pending={pending} onReview={review} />)}
    {order.status === "PENDING" && order.paymentStatus === "FAILED" && Number(order.paidAmount || 0) <= 0 && <button type="button" disabled={pending} onClick={changeFailedToCod} className="rounded-lg bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900 disabled:opacity-50">Failed payment → Cash on Delivery</button>}
  </section>;
}

function BanglaQrPaymentRow({ payment, maxAmount, pending, onReview }) {
  const [amountReceived, setAmountReceived] = useState(String(payment.amount));
  const validAmount = Number.isFinite(Number(amountReceived)) && Number(amountReceived) > 0;
  return <div className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-center">
    <div><p className="text-sm font-semibold">Bangla QR · Customer submitted ৳{Number(payment.amount).toLocaleString("en-BD")}</p><p className="text-sm text-text-muted">Customer TrxID: <span className="font-mono text-text">{payment.transactionId}</span></p></div>
    <label className="grid gap-1 text-sm font-semibold">প্রাপ্ত টাকা (৳)<input type="number" min="0.01" max={maxAmount || undefined} step="0.01" value={amountReceived} onChange={(event) => setAmountReceived(event.target.value)} className="w-full rounded-lg border border-border bg-surface px-3 py-2" /></label>
    <div className="flex gap-2"><button type="button" disabled={pending} onClick={() => onReview(payment.id, false)} className="rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">Reject</button><button type="button" disabled={pending || !validAmount} onClick={() => onReview(payment.id, true, amountReceived)} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">প্রাপ্ত টাকা নিশ্চিত</button></div>
  </div>;
}
