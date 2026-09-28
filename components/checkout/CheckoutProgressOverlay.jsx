"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";

const contentByStep = {
  creating: {
    title: "অর্ডার নিশ্চিত হচ্ছে",
    description: "আপনার তথ্য ও পণ্য যাচাই করে অর্ডারটি তৈরি করা হচ্ছে।",
  },
  "preparing-payment": {
    title: "অর্ডার নেওয়া হয়েছে",
    description: "এখন পেমেন্ট পেজ প্রস্তুত করা হচ্ছে।",
  },
  success: {
    title: "ধন্যবাদ!",
    description: "আপনার অর্ডারটি সফলভাবে নেওয়া হয়েছে।",
  },
  redirecting: {
    title: "পেমেন্ট পেজে নেওয়া হচ্ছে",
    description: "পেমেন্ট সম্পন্ন করতে পরের পেজে যান।",
  },
};

export default function CheckoutProgressOverlay({ step, orderNo }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!step) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [step]);

  if (!mounted || !step || !contentByStep[step]) return null;
  const complete = step === "success";
  const { title, description } = contentByStep[step];

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] grid min-h-[100dvh] place-items-center overflow-y-auto bg-slate-950/45 px-4 py-6 backdrop-blur-[2px]"
      role="alertdialog"
      aria-modal="true"
      aria-live="assertive"
      aria-label={title}
    >
      <div className="w-full max-w-[400px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_55px_-20px_rgba(15,23,42,0.5)]">
        <div className="h-1 w-full bg-primary" />
        <div className="p-6 text-center sm:p-7">
          <div className={`mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full ${complete ? "bg-emerald-50 text-emerald-600" : "bg-primary/10 text-primary"}`}>
            {complete
              ? <Check className="h-7 w-7" strokeWidth={2.5} />
              : <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-current/20 border-t-current" />}
          </div>
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-600">{description}</p>
          {orderNo && (
            <p className="mx-auto mt-4 w-fit rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              অর্ডার নম্বর: <span className="font-semibold">#{orderNo}</span>
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}