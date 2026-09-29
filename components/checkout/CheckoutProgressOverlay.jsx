"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Check, ShieldCheck, ShoppingBag, Sparkles } from "lucide-react";

const contentByStep = {
  creating: {
    eyebrow: "আপনার অর্ডার",
    title: "অর্ডার নিশ্চিত করছি",
    description: "পণ্য, দাম ও ডেলিভারি তথ্য মিলিয়ে অর্ডারটি নিরাপদে সংরক্ষণ করা হচ্ছে।",
  },
  "preparing-payment": {
    eyebrow: "অর্ডার নেওয়া হয়েছে",
    title: "পেমেন্ট প্রস্তুত হচ্ছে",
    description: "আপনার অর্ডার নম্বর তৈরি হয়েছে। এখন নিরাপদ পেমেন্ট পেজ খোলা হচ্ছে।",
  },
  redirecting: {
    eyebrow: "প্রায় হয়ে গেছে",
    title: "পেমেন্ট পেজে যাচ্ছেন",
    description: "পেমেন্ট সম্পন্ন করতে পরের পেজের নির্দেশনা অনুসরণ করুন।",
  },
  success: {
    eyebrow: "ধন্যবাদ!",
    title: "অর্ডার নেওয়া হয়েছে",
    description: "আপনার অর্ডার সফলভাবে সংরক্ষিত হয়েছে। কনফার্মেশন পেজে নিয়ে যাচ্ছি।",
  },
};

export default function CheckoutProgressOverlay({ step, orderNo }) {
  const [takingLonger, setTakingLonger] = useState(false);
  const content = contentByStep[step];
  const complete = step === "success";

  useEffect(() => {
    if (!step) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [step]);

  useEffect(() => {
    setTakingLonger(false);
    if (step !== "creating") return undefined;
    const timer = window.setTimeout(() => setTakingLonger(true), 6000);
    return () => window.clearTimeout(timer);
  }, [step]);

  if (!content || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-[#170b2b]/70 px-4 py-6 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-live="polite"
      aria-label={content.title}
    >
      <div className="relative w-full max-w-[430px] overflow-hidden rounded-[28px] bg-white text-slate-900 shadow-[0_28px_90px_-24px_rgba(15,10,35,0.65)]">
        <div className="relative h-40 overflow-hidden bg-gradient-to-br from-violet-800 via-fuchsia-700 to-pink-600 px-6 pt-6 text-white">
          <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full border border-white/20 bg-white/10" />
          <div className="pointer-events-none absolute -bottom-20 -left-12 h-44 w-44 rounded-full border border-white/15 bg-white/10" />
          <div className="relative flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-semibold"><Sparkles className="h-3.5 w-3.5" />{content.eyebrow}</span>
            <span className="inline-flex items-center gap-1.5 text-xs text-white/85"><ShieldCheck className="h-4 w-4" />নিরাপদ চেকআউট</span>
          </div>
        </div>

        <div className="relative -mt-10 rounded-t-[26px] bg-white px-6 pb-7 pt-0 text-center sm:px-8">
          <div className={`relative mx-auto -mt-8 grid h-20 w-20 place-items-center rounded-[24px] border-[5px] border-white shadow-xl ${complete ? "bg-emerald-500 text-white shadow-emerald-200" : "bg-violet-100 text-violet-700 shadow-violet-200"}`}>
            {complete ? <Check className="h-10 w-10" strokeWidth={3} /> : <ShoppingBag className="h-9 w-9" strokeWidth={2.2} />}
            {!complete && <span className="absolute -right-2 -top-2 h-6 w-6 animate-spin rounded-full border-[3px] border-violet-200 border-t-violet-700" aria-hidden="true" />}
          </div>
          <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">{content.title}</h2>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-600">{content.description}</p>

          {orderNo && <div className="mx-auto mt-5 w-fit rounded-xl border border-violet-100 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-800">অর্ডার নম্বর <span className="ml-1">#{orderNo}</span></div>}

          {!complete && (
            <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600"><span>{takingLonger ? "আর একটু সময় লাগছে" : "অর্ডার প্রক্রিয়াধীন"}</span><span className="inline-flex items-center gap-1 text-violet-700">কাজ চলছে <ArrowRight className="h-3.5 w-3.5" /></span></div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-violet-100" aria-hidden="true"><div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500" /></div>
              <p className="mt-3 text-xs leading-5 text-slate-500">{takingLonger ? "নেটওয়ার্কে একটু দেরি হচ্ছে। এই পেজটি খোলা রাখুন—অর্ডারটি একবারই পাঠানো হচ্ছে।" : "অপেক্ষা করুন, আমরা সব তথ্য মিলিয়ে নিচ্ছি।"}</p>
            </div>
          )}
          {complete && <p className="mt-5 text-sm font-medium text-emerald-700">কনফার্মেশন পেজে নেওয়া হচ্ছে…</p>}
        </div>
      </div>
    </div>,
    document.body,
  );
}