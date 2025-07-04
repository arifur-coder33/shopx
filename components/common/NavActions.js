// src/components/common/NavActions.js
"use client";

import { User2Icon } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";

// --- THE FIX: A PERFECTED LOADING STATE ---
// Give the placeholder the same styling as the icons it's replacing.
// The `animate-pulse` class gives it a subtle "loading" shimmer.
const IconPlaceholder = () => (
  <div className="nav-hover flex items-center justify-center h-6 w-6 rounded-md bg-slate-300 dark:bg-slate-700 animate-pulse" />
);

const DynamicCart = dynamic(() => import("../Cart"), {
  ssr: false,
  loading: () => <IconPlaceholder />, // Use the perfected placeholder
});

const DynamicLogout = dynamic(() => import("@/components/auth/Logout"), {
  ssr: false,
  loading: () => <IconPlaceholder />, // Use the same placeholder
});

const DynamicThemeToggle = dynamic(() => import("../TheamToggle"), {
  ssr: false,
  loading: () => <IconPlaceholder />, // Use the same placeholder
});

export default function NavActions() {
  return (
    <div className="flex flex-row justify-end gap-1 items-center">
      {/* This link is static, so it's fine */}
      <Link className="nav-hover" href={"/login"}>
        <User2Icon />
      </Link>

      {/* These will now load in seamlessly */}
      <DynamicLogout />
      <DynamicCart className="nav-hover" />
      <DynamicThemeToggle className="nav-hover" />
    </div>
  );
}
