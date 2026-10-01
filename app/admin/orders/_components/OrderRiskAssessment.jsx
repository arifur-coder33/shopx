"use client";

import { ChevronDown, MapPin } from "lucide-react";
import { useState } from "react";
import CustomerOrderHistoryButton from "./CustomerOrderHistoryButton";
import SteadfastFraudCheck from "./SteadfastFraudCheck";

const levelLabels = {
  LOW: "কম ঝুঁকি",
  MEDIUM: "মাঝারি ঝুঁকি",
  HIGH: "উচ্চ ঝুঁকি",
  VERY_HIGH: "খুব উচ্চ ঝুঁকি",
};

const levelStyles = {
  LOW: "border-emerald-200 bg-emerald-50 text-emerald-800",
  MEDIUM: "border-amber-200 bg-amber-50 text-amber-900",
  HIGH: "border-orange-200 bg-orange-50 text-orange-900",
  VERY_HIGH: "border-rose-200 bg-rose-50 text-rose-900",
};

export function OrderRiskBadge({ score, level, compact = false }) {
  if (!Number.isInteger(score)) {
    return <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-600">আগের অর্ডার · স্কোর নেই</span>;
  }
  const riskLevel = levelLabels[level] ? level : "LOW";
  return (
    <span className={"inline-flex items-center gap-1.5 rounded-full border px-2 py-1 font-bold " + levelStyles[riskLevel] + (compact ? " text-[10px]" : " text-xs")}>
      <span>{compact ? "রিস্ক" : "ঝুঁকি"}</span>
      <span>{score}/১০০</span>
      <span className="font-semibold">{levelLabels[riskLevel]}</span>
    </span>
  );
}

export default function OrderRiskAssessment({ order }) {
  const [expanded, setExpanded] = useState(false);
  const score = order?.fraudRiskScore;
  const savedFactors = Array.isArray(order?.fraudRiskFactors) ? order.fraudRiskFactors : [];
  const factors = savedFactors.filter((factor) => !["ORDER_ORIGIN", "STEADFAST_HISTORY", "STEADFAST_TRACKING"].includes(factor?.code));
  const origin = order?.orderOrigin || savedFactors.find((factor) => factor?.code === "ORDER_ORIGIN")?.origin || {};
  const steadfastHistory = savedFactors.find((factor) => factor?.code === "STEADFAST_HISTORY");
  const originName = [origin.city, origin.region, origin.country].filter(Boolean).join(", ");
  const originMapQuery = origin.latitude && origin.longitude
    ? `${origin.latitude},${origin.longitude}`
    : originName;
  const deliveryName = [order?.deliveryAddress, order?.thana, order?.city].filter(Boolean).join(", ");
  const normalizePlace = (value) => String(value || "").toLocaleLowerCase().replace(/[\s,.-]+/g, "").trim();
  const placeMatches = Boolean(origin.city && order?.city && (normalizePlace(origin.city).includes(normalizePlace(order.city)) || normalizePlace(order.city).includes(normalizePlace(origin.city))));
  const ip = String(order?.ipAddress || "").toLowerCase();
  const isLocalIp = !ip || ip === "unknown" || ip === "::1" || ip === "::" || ip === "localhost" ||
    ip.startsWith("127.") || ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("fc") ||
    ip.startsWith("fd") || ip.startsWith("fe80:") || /^172\.(1[6-9]|2\d|3[01])\./.test(ip);
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <button type="button" aria-expanded={expanded} aria-controls="order-risk-details" onClick={() => setExpanded((value) => !value)} className="flex min-h-12 w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-surface-muted/50">
        <h2 id="order-risk-title" className="text-sm font-bold text-text-primary">অর্ডার ঝুঁকি</h2>
        <span className="flex items-center gap-2">
          <span className="rounded-lg bg-surface-muted px-2.5 py-1 text-sm font-extrabold tabular-nums text-text-primary">{Number.isInteger(score) ? `${score}%` : "—"}</span>
          <ChevronDown className={`h-4 w-4 text-text-muted transition-transform ${expanded ? "rotate-180" : ""}`} />
        </span>
      </button>
      <div id="order-risk-details" hidden={!expanded} className="border-t border-border p-3">
      <p className="text-[11px] text-text-muted">যাচাইয়ের সহায়ক তথ্য · অর্ডার স্বয়ংক্রিয়ভাবে বাতিল হয় না</p>
      {Number.isInteger(score) ? (
        factors.length ? (
          <ul className="mt-3 space-y-1.5">
            {factors.map((factor) => (
              <li key={factor.code} className="flex items-start justify-between gap-3 rounded-xl bg-surface-muted/60 px-3 py-2 text-sm">
                <span><strong className="block font-semibold text-text-primary">{factor.label}</strong><span className="text-xs text-text-muted">{factor.detail}</span></span>
                <span className="shrink-0 rounded-full bg-white px-2 py-1 text-xs font-bold text-text-primary">+{factor.points}</span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">এই অর্ডারে উল্লেখযোগ্য ঝুঁকির সংকেত পাওয়া যায়নি।</p>
      ) : (
        <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">এই feature চালুর আগে তৈরি অর্ডারে ঝুঁকির স্কোর সংরক্ষিত নেই।</p>
      )}
      {Number.isInteger(score) && score >= 60 && <p className="mt-3 text-sm font-semibold text-rose-800">Dispatch-এর আগে ফোন ও অর্ডারের তথ্য যাচাই করুন।</p>}
      {Number.isInteger(score) && score >= 80 && <p className="mt-1 text-sm text-rose-800">অতিরিক্ত যাচাই না হওয়া পর্যন্ত hold করে রাখার পরামর্শ।</p>}
      <div className="mt-3 grid gap-2 rounded-lg bg-surface-muted/50 p-2.5 sm:grid-cols-2">
        <div className="min-w-0 rounded-lg bg-surface p-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-text-primary"><MapPin className="h-3.5 w-3.5 text-primary" />অর্ডার করার আনুমানিক জায়গা</div>
          <p className="mt-1 break-words text-xs text-text-secondary">{originName || (isLocalIp ? "এটি local/test IP; এখান থেকে আসল শহর জানা যাবে না" : "এই IP থেকে শহর/অঞ্চলের তথ্য পাওয়া যায়নি")}</p>
          {origin.source && <p className="mt-0.5 text-[10px] text-text-muted">তথ্যের উৎস: {origin.source}</p>}
          {originMapQuery && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(originMapQuery)}`} target="_blank" rel="noreferrer" className="mt-1.5 inline-block text-[11px] font-semibold text-primary underline">Map-এ দেখুন</a>}
          {order?.ipAddress && !isLocalIp && <p className="mt-1 break-all text-[10px] text-text-muted">IP: {order.ipAddress}</p>}
        </div>
        <div className="min-w-0 rounded-lg bg-surface p-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-text-primary"><MapPin className="h-3.5 w-3.5 text-emerald-600" />ডেলিভারি ঠিকানা</div>
          <p className="mt-1 break-words text-xs text-text-secondary">{deliveryName || "ঠিকানা দেওয়া নেই"}</p>
          {deliveryName && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(deliveryName)}`} target="_blank" rel="noreferrer" className="mt-1.5 inline-block text-[11px] font-semibold text-primary underline">Map-এ দেখুন</a>}
          {origin.city && order?.city && <p className={`mt-1 text-[10px] font-semibold ${placeMatches ? "text-emerald-700" : "text-amber-700"}`}>{placeMatches ? "আনুমানিক এলাকা মিলে" : "আনুমানিক এলাকা আলাদা"}</p>}
        </div>
      </div>
      <p className="mt-2 text-[10px] leading-4 text-text-muted">IP থেকে পাওয়া জায়গা আনুমানিক; মোবাইল নেটওয়ার্ক, VPN বা proxy-তে ভুল হতে পারে। ঠিকানার সঙ্গে অমিল একা fraud-এর প্রমাণ নয়।</p>
      <div className="mt-3 border-t border-border pt-3">
        <p className="mb-1.5 text-[11px] font-bold text-text-primary">এই customer-এর order history</p>
        <CustomerOrderHistoryButton phoneNumber={order?.phoneNumber} autoLoad={expanded} />
      </div>
      <SteadfastFraudCheck orderId={order?.id} initialData={steadfastHistory?.data || null} checkedAt={steadfastHistory?.checkedAt || null} />
      <details className="mt-3 rounded-xl border border-border bg-surface-muted/40 px-3 py-2 text-xs text-text-muted">
        <summary className="cursor-pointer font-semibold text-text-primary">স্কোরের নিয়ম দেখুন</summary>
        <p className="mt-2 leading-5">ফোনে ১০ মিনিটে পুনরাবৃত্তি: +২৫; ৫ বা তার বেশি অর্ডার হলে +৩৫। IP ও browser-এ ৩টি অর্ডার হলে +২০; ৬টি হলে +৩০। আগের COD ব্যর্থতা: ১টিতে +১০, ২–৩টিতে +২০, ৪ বা বেশি হলে +৩০। অসম্পূর্ণ ঠিকানায় +১৫। নতুন ফোনে ৳১০,০০০ বা বেশি COD অর্ডারে +১০। সব point যোগ করে সর্বোচ্চ ১০০ করা হয়।</p>
      </details>
      </div>
    </section>
  );
}

