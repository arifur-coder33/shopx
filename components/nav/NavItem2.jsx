"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavItem2({ children, href, mobile = false }) {
  const pathname = usePathname();

  const active =
    href === "/my-account" ? pathname === href : pathname.startsWith(href);

  return (
    <>
      {mobile ? (
        <Link
          href={href}
          className={`  p-4 rounded-xl  shadow-lg  text-center font-medium nav-hover flex flex-col items-center gap-2 hover:scale-105 ${active ? "bg-gradient-to-b from-primary to-background   hover:text-white" : ""}`}
        >
          {children}
        </Link>
      ) : (
        <Link
          href={href}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-300 transition-all duration-200 ease-in-out hover:scale-105 ${active ? "bg-gradient-to-b from-primary to-background " : ""}`}
        >
          {children}
        </Link>
      )}
    </>
  );
}
