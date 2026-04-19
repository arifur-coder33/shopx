"use client";
import { Package, User2Icon } from "lucide-react";

import Logout from "@/components/auth/Logout";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

export default function UserMenu({ children }) {
  const [open, setOpen] = useState(false);
  const { data: session, status } = useSession();
  console.log("UserMenu session:", session);
  console.log("UserMenu session status:", status);
  if (status === "loading") {
    return (
      <div className="h-6 w-6">
        <User2Icon className="opacity-50" />
      </div>
    );
  }
  if (status === "unauthenticated")
    return (
      <Link href="/login" className="nav-hover rounded-sm ">
        LogIn
      </Link>
    );

  return (
    <div
      className="md:relative hidden md:block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {/* Trigger */}
      <div className="h-6 w-6 cursor-pointer">
        {children ? children : <User2Icon />}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="md:absolute right-0 top-full pt-2  bg-slate-900 text-white w-48 rounded-xl shadow-lg  border border-gray-200 dark:border-slate-700 z-50">
          <div className="px-4 py-2 text-sm border-b dark:border-slate-700">
            👋 {session?.user?.name || session?.user?.email || "User"}
          </div>

          <Link
            prefetch={true}
            href="/my-account"
            className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-700"
          >
            <User2Icon size={16} /> My Account
          </Link>

          <Link
            prefetch={true}
            href="/my-account/orders"
            className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-700"
          >
            <Package size={16} /> My Orders
          </Link>

          <div className="border-t dark:border-slate-700">
            <Logout className="flex items-center gap-2 px-4 py-2 text-sm w-full text-left hover:bg-red-900">
              Logout
            </Logout>
          </div>
        </div>
      )}
    </div>
  );
}
