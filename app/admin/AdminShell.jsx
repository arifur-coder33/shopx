"use client";

import AdminNavBar from "@/components/nav/AdminNav";
import AdminSideNav from "@/components/nav/AdminSideNav";
import { SessionProvider } from "next-auth/react";
import { Suspense, useEffect, useState } from "react";
import { SWRConfig } from "swr";

const cn = (...classes) => classes.filter(Boolean).join(" ");

export default function AdminShell({ children, siteSetting }) {
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const toggleSidebar = () => {
    if (isMobile) setIsSidebarOpen((open) => !open);
    else setIsSidebarCollapsed((collapsed) => !collapsed);
  };

  return (
    <SWRConfig value={{ revalidateOnFocus: false }}>
      <SessionProvider>
        <AdminNavBar toggleSidebar={toggleSidebar} siteSetting={siteSetting} />
        <div className="mx-auto w-full max-w-[100rem]">
          <div className="relative flex">
            <AdminSideNav
              isMobile={isMobile}
              isOpen={isMobile ? isSidebarOpen : !isSidebarCollapsed}
              setIsOpen={setIsSidebarOpen}
              isCollapsed={isSidebarCollapsed}
            />
            <main
              className={cn(
                "min-h-screen min-w-0 flex-1 overflow-x-hidden p-2 transition-all duration-300 ease-in-out sm:p-4",
                isMobile ? "w-full" : isSidebarCollapsed ? "sm:ml-20" : "sm:ml-64",
              )}
            >
              <Suspense fallback={<div className="card">Loading…</div>}>
                {children}
              </Suspense>
            </main>
          </div>
        </div>
      </SessionProvider>
    </SWRConfig>
  );
}
