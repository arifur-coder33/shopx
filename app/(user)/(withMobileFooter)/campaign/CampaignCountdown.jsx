"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { replaceNumbers } from "@/utils/engToBanNumber";

function getCountdown(startAt, endAt, now) {
  const start = startAt ? new Date(startAt).getTime() : null;
  const end = endAt ? new Date(endAt).getTime() : null;
  if (start && start > now) return { label: "শুরু হতে বাকি", target: start, state: "upcoming" };
  if (end && end > now) return { label: "শেষ হতে বাকি", target: end, state: "active" };
  if (end && end <= now) return { label: "সময় শেষ", target: end, state: "ended" };
  return null;
}

export default function CampaignCountdown({ startAt, endAt, className = "", compact = false, showCompactLabel = false, cardCompact = false }) {
  const router = useRouter();
  const [now, setNow] = useState(null);
  const [refreshed, setRefreshed] = useState(false);

  useEffect(() => {
    setNow(Date.now());
    // Keep the countdown in sync with wall clock time. Browsers may throttle
    // intervals in background tabs, so refresh immediately when the tab returns.
    const updateNow = () => setNow(Date.now());
    const timer = window.setInterval(updateNow, 1000);
    window.addEventListener("focus", updateNow);
    document.addEventListener("visibilitychange", updateNow);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", updateNow);
      document.removeEventListener("visibilitychange", updateNow);
    };
  }, []);

  useEffect(() => {
    if (now == null || refreshed) return;
    const countdown = getCountdown(startAt, endAt, now);
    if (countdown?.state === "ended" || countdown?.target <= now) {
      setRefreshed(true);
      router.refresh();
    }
  }, [now, startAt, endAt, refreshed, router]);

  if (now == null) return compact || cardCompact
    ? <span className={"whitespace-nowrap text-sm font-medium text-text-muted " + className}>সময় গণনা হচ্ছে…</span>
    : <div className={"rounded-xl border border-primary/15 bg-primary-soft/50 p-3 " + className}>সময় গণনা হচ্ছে…</div>;
  const countdown = getCountdown(startAt, endAt, now);
  if (!countdown) return null;
  if (countdown.state === "ended") return compact || cardCompact
    ? <span className={"whitespace-nowrap text-sm font-medium text-text-muted " + className}>সময় শেষ</span>
    : <div className={"rounded-xl border border-border bg-surface p-3 text-sm font-semibold text-text-muted " + className}>সময় শেষ</div>;

  const secondsLeft = Math.max(0, Math.ceil((countdown.target - now) / 1000));
  const days = Math.floor(secondsLeft / 86400);
  const hours = Math.floor((secondsLeft % 86400) / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;
  const units = [
    ...(days > 0 ? [[days, "দিন"]] : []),
    [hours, "ঘণ্টা"],
    [minutes, "মিনিট"],
    [seconds, "সেকেন্ড"],
  ];

  if (cardCompact) {
    const cardUnits = [
      ...(days > 0 ? [[days, "দিন"]] : []),
      [hours, "ঘ"],
      [minutes, "মি"],
      [seconds, "সে"],
    ];
    return <span title={countdown.label} className={"flex min-w-0 items-center gap-1.5 whitespace-nowrap " + className}>
      <span className="hidden shrink-0 text-xs font-semibold sm:inline sm:text-sm">{countdown.label}</span>
      <span aria-hidden="true" className="hidden text-primary/50 sm:inline">·</span>
      <span className="flex min-w-0 items-center gap-1">
      {cardUnits.map(([value, label]) => <span key={label} className="campaign-flip-unit">
        <strong key={`${label}-${value}`} className="campaign-flip-digit">{replaceNumbers(String(value).padStart(2, "0"))}</strong>
        <small>{label}</small>
      </span>)}
      </span>
    </span>;
  }

  if (compact) {
    const time = (days > 0 ? replaceNumbers(String(days)) + "দি " : "") +
      replaceNumbers(String(hours).padStart(2, "0")) + "ঘ " +
      replaceNumbers(String(minutes).padStart(2, "0")) + "মি " +
      replaceNumbers(String(seconds).padStart(2, "0")) + "সে";
    return <span title={countdown.label} className={"whitespace-nowrap text-sm font-semibold text-text-muted " + className}>{showCompactLabel ? `${countdown.label}: ` : ""}{time}</span>;
  }

  return <div className={"rounded-xl border border-primary/20 bg-gradient-to-br from-primary-soft/70 via-surface to-primary-soft/40 p-4 shadow-sm sm:p-5 " + className}>
    <div className="mb-3 flex items-center gap-2 text-base font-bold text-primary sm:text-lg">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
      <span>{countdown.label}</span>
    </div>
    <div className="flex flex-wrap items-center gap-2 sm:gap-3" aria-live="off">
      {units.map(([value, label]) => <span key={label} className="campaign-flip-unit campaign-flip-unit-large">
        <strong key={`${label}-${value}`} className="campaign-flip-digit">{replaceNumbers(String(value).padStart(2, "0"))}</strong>
        <small>{label}</small>
      </span>)}
    </div>
  </div>;
}
