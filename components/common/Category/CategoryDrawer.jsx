// src/components/Cart.js
"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Menu } from "lucide-react";

const CategoryTree = dynamic(() => import("./CategoryTree"), {
  loading: () => (
    <div className="space-y-3 p-3" aria-label="বিভাগ লোড হচ্ছে">
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className="h-12 animate-pulse rounded-xl bg-surface-muted" />
      ))}
    </div>
  ),
});
const Modal = dynamic(() => import("@/components/Modal"), {
  ssr: false,
});

export default function CategoryDrawer({ className = "", children, initialData }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label="পণ্যের বিভাগ দেখুন"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
        className={`relative flex h-11 w-11 items-center justify-center rounded-brand border border-border bg-surface text-text shadow-sm transition hover:border-primary hover:bg-primary-soft hover:text-primary ${className}`}
      >
        {children || <Menu className="h-6 w-6" />}
      </button>

      {isOpen && (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} openStyle="left">
          <CategoryTree initialData={initialData} setIsOpen={setIsOpen} />
        </Modal>
      )}
    </>
  );
}
