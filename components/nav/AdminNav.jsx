// components/nav/AdminNavBar.jsx

"use client";

import Logout from "@/components/auth/Logout";
import UserName from "@/components/auth/UserName";
import Logo from "@/components/common/Logo";
import ThemeToggle from "@/components/TheamToggle";
import { AlignJustify, User2Icon } from "lucide-react";
import Link from "next/link";

// Note: Removed 'async' as this is now a client component
export default function AdminNavBar({ toggleSidebar }) {
  return (
    <header className="sticky top-0 z-30 w-full bg-slate-900/80 dark:bg-slate-950/80 backdrop-blur-sm shadow-sm shadow-slate-700">
      <div className="mx-auto flex flex-row justify-between items-center max-w-7xl h-16 px-4">
        <div className="flex flex-row gap-4 items-center">
          {/* This button will toggle the sidebar */}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
            aria-label="Toggle navigation"
          >
            <AlignJustify />
          </button>
          <div className="text-3xl font-bold">
            <Link href={"/admin"}>
              <Logo />
            </Link>
          </div>
        </div>
        <div className="flex flex-row justify-end gap-2 items-center">
          <div className="hidden sm:block">
            <UserName />
          </div>
          <Link
            className="p-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
            href={"/profile"}
          >
            <User2Icon />
          </Link>

          <Logout className="p-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-700 transition-colors" />

          <ThemeToggle className="p-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-700 transition-colors" />
        </div>
      </div>
    </header>
  );
}
