"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CheckCircle2, Home, PackageCheck } from "lucide-react";
import ProductCard from "@/components/products/ProductCard";
import { reconfirmCustomerOrderAction } from "@/backend/serverActions/orderActions";

export default function OrderSuccessExperience({ order, phoneNumber, reconfirm, products, paymentSuccess = false }) {
  const [confirmed, setConfirmed] = useState(order.confirmed);
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const reConfirm = () => startTransition(async () => {
    const result = await reconfirmCustomerOrderAction({ orderNo: order.orderNo, phoneNumber });
    setNotice(result.message || "");
    if (result.success) setConfirmed(true);
  });

  return <main className="mx-auto min-h-[70vh] w-full max-w-6xl space-y-8 px-4 py-8 text-text sm:py-12">
    <section className="mx-auto max-w-3xl rounded-3xl border border-border bg-surface p-6 text-center shadow-sm sm:p-10">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary"><CheckCircle2 size={36} /></div>
      <h1 className="mt-4 text-2xl font-black text-primary sm:text-3xl">{paymentSuccess ? "পেমেন্ট সফল হয়েছে" : "আলহামদুলিল্লাহ, অর্ডারটি গ্রহণ করা হয়েছে"}</h1>
      <p className="mx-auto mt-3 max-w-xl text-text-muted">{paymentSuccess ? "আপনার পেমেন্ট সম্পন্ন হয়েছে।" : "আপনার অর্ডারটি সফলভাবে সম্পন্ন হয়েছে।"}</p>
      <div className="mx-auto mt-6 max-w-md rounded-2xl bg-surface-muted p-4"><span className="text-sm text-text-muted">অর্ডার নম্বর</span><strong className="mt-1 block break-all text-xl">{order.orderNo}</strong><span className="mt-2 inline-flex rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">Status: {order.status}</span></div>
      {reconfirm.enabled && order.status === "PENDING" && <div className="mt-7 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-7">
        <h2 className="text-xl font-bold">অর্ডারটি re-confirm করুন</h2>
        <p className="mt-2 text-text-muted">{reconfirm.message}</p>
        {confirmed ? <p role="status" className="mt-4 font-semibold text-primary">আপনার অর্ডার re-confirm করা হয়েছে।</p> : <button type="button" disabled={pending} onClick={reConfirm} className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-brand bg-primary px-6 py-3 font-bold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"><PackageCheck size={20} />{pending ? "Confirming…" : "Re-confirm Order"}</button>}
        {notice && !confirmed && <p role="alert" className="mt-3 text-sm text-danger">{notice}</p>}
      </div>}
      <div className="mt-6 flex flex-wrap justify-center gap-3"><Link href={`/tracking?o=${encodeURIComponent(order.orderNo)}&p=${encodeURIComponent(phoneNumber)}`} className="inline-flex min-h-11 items-center gap-2 rounded-brand bg-secondary px-5 py-2.5 font-semibold text-white"><PackageCheck size={18} />অর্ডারের বিস্তারিত</Link><Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-brand border border-border px-5 py-2.5 font-semibold"><Home size={18} />কেনাকাটা চালিয়ে যান</Link></div>
    </section>
    {products.length > 0 && <section><div className="mb-4"><h2 className="text-xl font-black sm:text-2xl">You may also like</h2><p className="mt-1 text-sm text-text-muted">আপনার অর্ডারের পছন্দের সঙ্গে মিল আছে এমন কিছু পণ্য</p></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">{products.map((product, index) => <ProductCard key={product.id} product={product} priority={index < 2} />)}</div></section>}
  </main>;
}
