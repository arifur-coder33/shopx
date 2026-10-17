"use client";

import { useState } from "react";
import { Check, Copy, Facebook, MessageCircle, Share2 } from "lucide-react";

export default function ProductShareButton({ title }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const getShareUrl = () => (typeof window === "undefined" ? "" : window.location.href);

  const copyLink = async () => {
    const url = getShareUrl();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement("textarea");
      input.value = url;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const shareNative = async () => {
    if (!navigator.share) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({ title, url: getShareUrl() });
      setOpen(false);
    } catch (error) {
      if (error?.name !== "AbortError") setOpen(true);
    }
  };

  const openSocialShare = (platform) => {
    const encodedUrl = encodeURIComponent(getShareUrl());
    const encodedTitle = encodeURIComponent(title || "এই পণ্যটি দেখুন");
    const shareUrl = platform === "whatsapp"
      ? `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`
      : `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="পণ্যটি শেয়ার করুন"
        aria-expanded={open}
        aria-haspopup="menu"
        className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-text transition hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <Share2 className="h-5 w-5" aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" aria-label="Share options" className="absolute right-0 top-full z-30 mt-2 w-52 rounded-xl border border-border bg-surface p-2 shadow-xl">
          <button type="button" role="menuitem" onClick={shareNative} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm hover:bg-primary-soft">
            <Share2 className="h-4 w-4" /> Share options
          </button>
          <button type="button" role="menuitem" onClick={copyLink} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm hover:bg-primary-soft">
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            {copied ? "লিংক কপি হয়েছে" : "লিংক কপি করুন"}
          </button>
          <button type="button" role="menuitem" onClick={() => openSocialShare("whatsapp")} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm hover:bg-primary-soft">
            <MessageCircle className="h-4 w-4 text-green-600" /> WhatsApp
          </button>
          <button type="button" role="menuitem" onClick={() => openSocialShare("facebook")} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm hover:bg-primary-soft">
            <Facebook className="h-4 w-4 text-blue-600" /> Facebook
          </button>
        </div>
      )}
    </div>
  );
}
