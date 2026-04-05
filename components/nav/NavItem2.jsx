"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavItem2({ children, href }) {
  const pathname = usePathname();

  const active =
    href === "/my-account" ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`nav-item2 ${active ? "nav-item2-active" : ""}`}
    >
      {children}
    </Link>
  );
}
