// app/admin/layout.jsx

"use client";

import AdminNavBar from "@/components/nav/AdminNav";
import AdminSideNav from "@/components/nav/AdminSideNav";
import { SessionProvider } from "next-auth/react";
import { Suspense, useEffect, useState } from "react";
import { SWRConfig } from "swr";

// A tiny helper for conditional classnames
const cn = (...classes) => classes.filter(Boolean).join(" ");

export default function AdminLayout({ children }) {
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // For mobile view
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // For desktop view

  // Effect to detect screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640); // Tailwind's 'sm' breakpoint
    };
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const toggleSidebar = () => {
    if (isMobile) {
      setIsSidebarOpen(!isSidebarOpen);
    } else {
      setIsSidebarCollapsed(!isSidebarCollapsed);
    }
  };

  return (
    <SWRConfig>
      <SessionProvider>
        {/* Pass the toggle function and state to the navbar */}
        <AdminNavBar toggleSidebar={toggleSidebar} />

        <div className="max-w-7xl mx-auto">
          <div className="flex flex-row relative">
            {/* Pass state and setters to the sidebar */}
            <AdminSideNav
              isMobile={isMobile}
              isOpen={isMobile ? isSidebarOpen : !isSidebarCollapsed}
              setIsOpen={setIsSidebarOpen}
              isCollapsed={isSidebarCollapsed}
            />

            {/* Main content adjusts its margin based on sidebar state */}
            <main
              className={cn(
                "flex-1 min-h-screen transition-all duration-300 ease-in-out",
                isMobile
                  ? "w-full"
                  : isSidebarCollapsed
                  ? "sm:ml-20"
                  : "sm:ml-64"
              )}
            >
              <Suspense fallback={<div className="p-6">Loading...</div>}>
                {children}
              </Suspense>
            </main>
          </div>
        </div>
      </SessionProvider>
    </SWRConfig>
  );
}
