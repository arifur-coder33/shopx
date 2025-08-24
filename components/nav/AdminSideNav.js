// File: components/nav/AdminSideNav.jsx

"use client";

import { adminMenuItems } from "@/lib/adminMenuItems";
import { User } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";

import Logout from "@/components/auth/Logout";
import ModernNavItem from "./ModernNavItem";

const cn = (...classes) => classes.filter(Boolean).join(" ");

export default function AdminSideNav({
  isMobile,
  isOpen,
  setIsOpen,
  isCollapsed,
}) {
  const { data: session } = useSession();

  const handleLinkClick = () => {
    if (isMobile) {
      setIsOpen(false);
    }
  };

  // Reusable component for the navigation content
  const NavContent = ({ isCollapsed, onLinkClick }) => (
    <div className="flex flex-col h-full">
      {/* Scrollable main navigation area */}
      <div className="flex-1 overflow-y-auto">
        <nav className="flex flex-col gap-1 px-2 pt-4">
          {adminMenuItems.map((item, index) => (
            <ModernNavItem
              key={index}
              item={item}
              isCollapsed={isCollapsed}
              onLinkClick={onLinkClick}
            />
          ))}
        </nav>
      </div>

      {/* Fixed bottom section */}
      <div className="flex-shrink-0 p-2">
        <div className="border-t border-slate-700 pt-2 flex flex-col gap-1">
          {/* Profile Link */}
          <Link
            href="/admin/profile"
            title={isCollapsed ? session?.user?.name || "Profile" : ""}
            className={cn(
              "flex items-center p-2 rounded-lg cursor-pointer transition-colors duration-200", // 1. Removed gap-3
              "text-slate-400 hover:bg-slate-700 hover:text-white"
            )}
            style={{ justifyContent: isCollapsed ? "center" : "flex-start" }}
            onClick={onLinkClick}
          >
            <User className="h-5 w-5 flex-shrink-0" />
            <span
              className={cn(
                "transition-opacity",
                isCollapsed ? "opacity-0 w-0" : "opacity-100 ml-3" // 2. Added conditional margin
              )}
            >
              {!isCollapsed && (session?.user?.name || "Profile")}
            </span>
          </Link>
          {/* Logout Wrapper */}
          <div
            title={isCollapsed ? "Logout" : ""}
            className={cn(
              // 1. Removed gap-3 from the wrapper
              "flex items-center p-2 rounded-lg cursor-pointer transition-colors duration-200 w-full",
              "text-slate-400 hover:bg-red-500/80 hover:text-white"
            )}
            style={{ justifyContent: isCollapsed ? "center" : "flex-start" }}
          >
            {/* 3. Simplified Logout component classes to avoid redundant styling */}
            <Logout className="flex-shrink-0" />
            <span
              className={cn(
                "transition-opacity pointer-events-none",
                // 2. Added conditional margin for spacing only when expanded
                isCollapsed ? "opacity-0 w-0" : "opacity-100 ml-3"
              )}
            >
              {!isCollapsed && "Logout"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // Mobile Overlay View
  if (isMobile) {
    return (
      <>
        {isOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setIsOpen(false)}
          ></div>
        )}
        <aside
          className={cn(
            "fixed top-0 left-0 h-full w-64 bg-slate-900 dark:bg-slate-950 text-slate-200 z-50 transition-transform duration-300 ease-in-out",
            isOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <NavContent isCollapsed={false} onLinkClick={handleLinkClick} />
        </aside>
      </>
    );
  }

  // Desktop Sidebar View
  return (
    <aside
      className={cn(
        "hidden sm:flex flex-col h-[calc(100vh-70px)] bg-slate-900 dark:bg-slate-950 text-slate-200 fixed transition-all duration-300 ease-in-out",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      <NavContent isCollapsed={isCollapsed} onLinkClick={() => {}} />
    </aside>
  );
}
