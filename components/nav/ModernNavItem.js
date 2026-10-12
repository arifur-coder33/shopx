"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

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

  const isParentActive = useMemo(
    () => isChildActive(subMenu, pathname),
    [subMenu, pathname]
  );
  const [isAccordionOpen, setIsAccordionOpen] = useState(isParentActive);
  const [openPopover, setOpenPopover] = useState(false);

  const href = slug === "#" ? "#" : `/admin${slug === "/" ? "" : `/${slug}`}`;
  const isActive = pathname === href;

  const MainElement =
    (!isCollapsed || !isSubMenu) && slug !== "#" ? Link : "div";

  const handleClick = () => {
    if (!isCollapsed && isSubMenu) {
      setIsAccordionOpen((prev) => !prev);
    }
    if (slug !== "#" && onLinkClick) {
      onLinkClick();
    }
  };

  // Collapsed Sidebar
  if (isCollapsed) {
    if (!isSubMenu) {
      // No submenu → just icon
      return (
        <div
          className={cn(
            "flex items-center justify-center p-2 rounded-lg cursor-pointer transition-colors duration-200 group",
            (isActive || isParentActive) &&
              "bg-slate-700 text-white font-semibold",
            "text-slate-300 hover:bg-slate-700 hover:text-white"
          )}
        >
          {Icon && <Icon className="h-5 w-5 flex-shrink-0" />}
        </div>
      );
    }

    // Submenu exists → Popover hover
    return (
      <div
        className="relative"
        onMouseEnter={() => setOpenPopover(true)}
        onMouseLeave={() => setOpenPopover(false)}
      >
        <Popover open={openPopover} onOpenChange={setOpenPopover}>
          <PopoverTrigger asChild>
            <div
              className={cn(
                "flex items-center justify-center p-2 rounded-lg cursor-pointer transition-colors duration-200 group",
                (isActive || isParentActive) &&
                  "bg-slate-700 text-white font-semibold",
                "text-slate-300 hover:bg-slate-700 hover:text-white"
              )}
            >
              {Icon && <Icon className="h-5 w-5 flex-shrink-0" />}
            </div>
          </PopoverTrigger>

          <PopoverContent
            side="right"
            align="start"
            className="w-52 border border-slate-700 bg-slate-800 p-2 text-slate-100 shadow-lg"
          >
            <div className="mb-2 text-sm font-semibold">{name}</div>
            <ul className="flex flex-col gap-1">
              {subMenu.map((subItem) => (
                <ModernNavItem item={subItem} key={subItem?.name} />
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  // Expanded Sidebar
  return (
    <div className="relative">
      <MainElement
        href={href}
        onClick={handleClick}
        className={cn(
          "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors duration-200 group",
              "text-slate-300 hover:bg-slate-700 hover:text-white",
          (isActive || isParentActive) &&
            "bg-slate-700 text-white font-semibold"
        )}
        style={{
          paddingLeft: `${0.5 + level * 0.75}rem`,
        }}
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className="h-5 w-5 flex-shrink-0" />}
          <span>{name}</span>
        </div>
        {isSubMenu && (
          <ChevronDown
            className={cn(
              "h-5 w-5 transform transition-transform duration-300",
              isAccordionOpen && "rotate-180"
            )}
          />
        )}
      </MainElement>

      {/* Accordion Submenu */}
      {isSubMenu && (
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
