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
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
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
      <span className="shrink-0 text-xs font-semibold sm:text-sm">{countdown.label}</span>
      <span aria-hidden="true" className="text-primary/50">·</span>
      {cardUnits.map(([value, label]) => <span key={label} className="inline-flex items-baseline gap-0.5">
        <strong className="text-lg font-bold tabular-nums text-foreground sm:text-xl">{replaceNumbers(String(value).padStart(2, "0"))}</strong>
        <small className="text-xs font-medium sm:text-sm">{label}</small>
      </span>)}
    </span>;
  }

  if (compact) {
    const time = (days > 0 ? replaceNumbers(String(days)) + "দি " : "") +
      replaceNumbers(String(hours).padStart(2, "0")) + "ঘ " +
      replaceNumbers(String(minutes).padStart(2, "0")) + "মি " +
      replaceNumbers(String(seconds).padStart(2, "0")) + "সে";
    return <span title={countdown.label} className={"whitespace-nowrap text-sm font-semibold text-text-muted " + className}>{showCompactLabel ? `${countdown.label}: ` : ""}{time}</span>;
  }

  return <div className={"rounded-xl border border-primary/15 bg-gradient-to-br from-primary-soft/70 via-surface to-primary-soft/40 p-3 shadow-sm sm:p-4 " + className}>
    <div className="mb-2 flex items-center gap-2 text-sm font-bold text-primary sm:text-base">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
      <span>{countdown.label}</span>
    </div>
    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2" aria-live="off">
      {units.map(([value, label]) => <div key={label} className="flex min-w-[3.5rem] flex-col items-center rounded-lg border border-primary/10 bg-surface px-2 py-1.5 shadow-sm sm:min-w-[4.25rem] sm:px-3 sm:py-2">
        <span className="text-lg font-black leading-none tabular-nums text-primary sm:text-2xl">{replaceNumbers(String(value).padStart(2, "0"))}</span>
        <span className="mt-1 text-[10px] font-semibold text-text-muted sm:text-xs">{label}</span>
      </div>)}
    </div>
  </div>;
}
