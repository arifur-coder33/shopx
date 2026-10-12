// components/nav/AdminNavBar.jsx

"use client";

import Logout from "@/components/auth/Logout";
import UserName from "@/components/auth/UserName";
import Logo from "@/components/common/Logo";
import ThemeToggle from "@/components/TheamToggle";
import { AlignJustify, User2Icon } from "lucide-react";
import Link from "next/link";

// Note: Removed 'async' as this is now a client component
export default function AdminNavBar({ toggleSidebar, siteSetting }) {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-700 bg-slate-900/95 text-slate-200 backdrop-blur-sm shadow-sm">
      <div className="mx-auto flex flex-row justify-between items-center max-w-7xl h-16 px-4">
        <div className="flex flex-row gap-4 items-center">
          {/* This button will toggle the sidebar */}
          <button
            onClick={toggleSidebar}
            className="rounded-md p-2 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
            aria-label="Toggle navigation"
          >
            <AlignJustify />
          </button>
          <div className="text-3xl font-bold">
            <Link href={"/admin"}>
              <Logo data={siteSetting} />
            </Link>
          </div>
        </div>
        <div className="flex flex-row justify-end gap-2 items-center">
          <UserName className="max-w-[35vw] truncate text-sm font-medium text-slate-200" />
          <Link
            className="rounded-md p-2 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
            href={"/admin/profile"}
            aria-label="Admin profile"
            title="Admin profile"
          >
            <User2Icon />
          </Link>

          <Logout className="rounded-md p-2 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white" />

          <ThemeToggle buttonClassName="rounded-md p-2 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white" />
        </div>
      </div>
    </header>
  );
}
