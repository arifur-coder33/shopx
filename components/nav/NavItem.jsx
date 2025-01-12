'use client'
import { usePathname } from "next/navigation";
import Link from "next/link";
export default function NavItem({ item }) {
    const pathname = usePathname();
    const isActive = pathname === `/admin/${item.slug}` || (pathname === "/admin" && item.slug === "/");
  
    return (
      <div
        className={`p-2 text-slate-200 border-b-2 border-slate-700 ${
          isActive ? "bg-blue-600 font-bold" : "bg-slate-800"
        }`}
      >
        <Link href={`/admin/${item.slug}`}>{item.name}</Link>
      </div>
    );
  }