"use client";
import { LogOutIcon, Package, User2Icon } from "lucide-react";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
const Logout = dynamic(() => import("@/components/auth/Logout"));
export default function UserMenu({ children }) {
  const [open, setOpen] = useState(false);
  const { data: session, status } = useSession();
  if (!session) return null;

  return (
    <div
      className="relative hidden md:block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {/* Trigger */}
      <div className="h-6 w-6 cursor-pointer">
        {children ? children : <User2Icon />}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0  bg-slate-900 text-white w-48 rounded-xl shadow-lg  border border-gray-200 dark:border-slate-700 z-50">
          <div className="px-4 py-2 text-sm border-b dark:border-slate-700">
            👋 {session?.user?.email || "User"}
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
              <LogOutIcon size={16} /> Logout
            </Logout>
          </div>
        </div>
      )}
    </div>
  );
}
