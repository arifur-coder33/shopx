"use client";
import { useState } from "react";
import { toast } from "react-toastify";

export default function CopyLinkButton({ link }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
      toast.warn("Failed to copy link");
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="ml-2 px-2 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
    >
      {copied ? "Copied ✅" : "Copy Link"}
    </button>
  );
}
