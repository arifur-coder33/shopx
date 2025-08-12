// File: components/nav/ModernNavItem.jsx

"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

const cn = (...classes) => classes.filter(Boolean).join(" ");

const isChildActive = (subMenu, pathname) => {
  if (!subMenu) return false;
  return subMenu.some((item) => {
    const href = `/admin${item.slug === "/" ? "" : `/${item.slug}`}`;
    if (pathname === href) return true;
    return isChildActive(item.subMenu, pathname);
  });
};

export default function ModernNavItem({
  item,
  level = 0,
  isCollapsed,
  onLinkClick,
}) {
  const { name, slug, icon: Icon, subMenu } = item;
  const pathname = usePathname();
  const isSubMenu = subMenu && subMenu.length > 0;

  const flyoutRef = useRef(null);
  const isParentActive = useMemo(
    () => isChildActive(subMenu, pathname),
    [subMenu, pathname]
  );

  const [isAccordionOpen, setIsAccordionOpen] = useState(isParentActive);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  // Effect to close flyout when clicking outside of it
  useEffect(() => {
    function handleClickOutside(event) {
      if (flyoutRef.current && !flyoutRef.current.contains(event.target)) {
        setIsFlyoutOpen(false);
      }
    }
    if (isFlyoutOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isFlyoutOpen]);

  const href = slug === "#" ? "#" : `/admin${slug === "/" ? "" : `/${slug}`}`;
  const isActive = pathname === href;

  const MainElement = (isCollapsed && isSubMenu) || slug === "#" ? "div" : Link;

  const handleClick = (e) => {
    const isFlyoutTrigger = isCollapsed && isSubMenu;

    if (isFlyoutTrigger) {
      setIsFlyoutOpen((prev) => !prev);
      return;
    }

    if (isSubMenu) {
      setIsAccordionOpen((prev) => !prev);
    }

    if (slug !== "#" && onLinkClick) {
      onLinkClick();
    }
  };

  return (
    <div className="relative">
      {/* The main clickable navigation item */}
      <MainElement
        href={href}
        onClick={handleClick}
        title={isCollapsed ? name : ""}
        className={cn(
          "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors duration-200 group",
          "text-slate-300 hover:bg-slate-700",
          (isActive || isParentActive) &&
            "bg-slate-700 text-white font-semibold"
        )}
        style={{
          paddingLeft: isCollapsed ? "0.5rem" : `${0.5 + level * 0.75}rem`,
          justifyContent: isCollapsed ? "center" : "space-between",
        }}
      >
        <div className="flex items-center gap-3">
          {/* ---- FIX IS HERE ---- */}
          {Icon && (
            <Icon className="h-5 w-5 flex-shrink-0 pointer-events-none" />
          )}
          <span
            className={cn(
              "transition-all duration-200",
              isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
            )}
          >
            {name}
          </span>
        </div>
        {isSubMenu && !isCollapsed && (
          <ChevronDown
            className={cn(
              "h-5 w-5 transform transition-transform duration-300",
              isAccordionOpen && "rotate-180"
            )}
          />
        )}
      </MainElement>

      {/* Flyout Menu (for collapsed sidebar) */}
      {isCollapsed && isSubMenu && isFlyoutOpen && (
        <div
          ref={flyoutRef}
          className="absolute left-full top-0 ml-2 z-20 w-52 rounded-lg bg-slate-800 p-2 shadow-lg"
        >
          <div className="mb-2 px-2 text-sm font-semibold text-white">
            {name}
          </div>
          <ul className="flex flex-col gap-1">
            {subMenu.map((subItem) => (
              <li key={subItem.slug}>
                <Link
                  href={`/admin/${subItem.slug}`}
                  onClick={() => {
                    setIsFlyoutOpen(false);
                    if (onLinkClick) onLinkClick();
                  }}
                  className="flex w-full items-center gap-2 rounded-md p-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
                >
                  {subItem.icon && <subItem.icon className="h-4 w-4" />}
                  <span>{subItem.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Accordion SubMenu (for expanded sidebar) */}
      {!isCollapsed && isSubMenu && (
        <div
          className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out grid",
            isAccordionOpen
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0"
          )}
        >
          <div className="overflow-hidden flex flex-col gap-1 pt-1">
            {subMenu.map((subItem, index) => (
              <ModernNavItem
                key={index}
                item={subItem}
                level={level + 1}
                isCollapsed={isCollapsed}
                onLinkClick={onLinkClick}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
