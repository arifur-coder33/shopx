"use client";
import { Minus, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function NavItem({ item }) {
  const isSubMenu = item.subMenu && item.subMenu.length > 0;
  const pathname = usePathname();
  const isActive =
    pathname === `/admin/${item.slug}` ||
    (pathname === "/admin" && item.slug === "/");

  const [showSubMenu, setShowSubMenu] = useState(false);
  const totalCount = item.subMenu ? item.subMenu.length : 0;

  return (
    <div
      className={`p-2 text-slate-200 border-b-2 border-slate-700 text-base ${
        isActive ? "bg-blue-600 font-bold" : "bg-slate-800"
      }`}
    >
      {/* Main Item */}
      <div className="flex flex-row justify-between items-center">
        <Link href={`/admin/${item.slug}`}>{item.name}</Link>
        {isSubMenu && !showSubMenu ? (
          <Plus
            className="cursor-pointer"
            onClick={() => setShowSubMenu((prev) => !prev)}
          />
        ) : (
          showSubMenu && (
            <Minus
              className="cursor-pointer"
              onClick={() => setShowSubMenu((prev) => !prev)}
            />
          )
        )}
      </div>

      {/* SubMenu Container (always in DOM, animated) */}
      {isSubMenu && (
        <div
          className={`overflow-hidden transition-all duration-500 ease-in-out ${
            showSubMenu ? "max-h-96 opacity-100 " : "max-h-0 opacity-0"
          }`}
        >
          {item.subMenu.map((subItem, index) => (
            <NavItem
              key={subItem.slug}
              item={subItem}
              index={index}
              totalCount={totalCount}
            />
          ))}
        </div>
      )}
    </div>
  );
}
