"use client";

import Logout from "@/components/auth/Logout";
import ThemeToggle from "@/components/TheamToggle";
import { Minus, Plus } from "lucide-react";
import Link from "next/link";
import { memo, useState } from "react";

// ================= ICON =================
function PlusMinus({ open }) {
  return (
    <span className="w-5 h-5 flex items-center justify-center text-sm font-bold cursor-pointer">
      {open ? <Minus className="text-red-600 " /> : <Plus />}
    </span>
  );
}

// ================= PATH BUILDER =================
function buildCategoryPath(category, parentPath = "") {
  return parentPath ? `${parentPath}/${category.slug}` : category.slug;
}

// ================= ITEM =================
const CategoryItem = memo(function CategoryItem({
  category,
  level = 0,
  activeId,
  setActiveId,
  setIsOpen,
  parentPath = "",
}) {
  const hasChildren = category.subCategories?.length > 0;
  const isOpen = activeId === category.id;

  const fullPath = buildCategoryPath(category, parentPath);

  return (
    <div>
      {/* Row */}
      <div
        className={`flex items-center justify-between px-4 py-3 transition-all rounded-xl cursor-pointer group
        ${
          level === 0
            ? "hover:bg-slate-800"
            : "bg-gray-700 dark:bg-slate-800 hover:bg-gray-800 dark:hover:bg-slate-700 ml-2"
        }`}
        style={{ paddingLeft: `${level * 14 + 14}px` }}
      >
        {/* Link */}
        <Link
          href={`/category/${fullPath}`}
          onClick={() => setIsOpen?.(false)}
          className="text-sm font-medium flex-1 group-hover:translate-x-1 transition-all"
        >
          {category.name}
        </Link>

        {/* Toggle */}
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveId(isOpen ? null : category.id);
            }}
            className="ml-2 rounded-md hover:bg-gray-500 dark:hover:bg-slate-600 p-1"
          >
            <PlusMinus open={isOpen} />
          </button>
        )}
      </div>

      {/* Children with smooth animation */}
      {hasChildren && (
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out
          ${isOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"}`}
        >
          <SubList
            categories={category.subCategories}
            level={level + 1}
            setIsOpen={setIsOpen}
            parentPath={fullPath}
          />
        </div>
      )}
    </div>
  );
});

// ================= SUB LIST =================
const SubList = memo(function SubList({
  categories,
  level,
  setIsOpen,
  parentPath = "",
}) {
  const [activeId, setActiveId] = useState(null);

  return (
    <div className="ml-2 mt-1 border-l border-gray-200 dark:border-slate-700 pl-1 space-y-1">
      {categories.map((cat) => (
        <CategoryItem
          key={cat.id}
          category={cat}
          level={level}
          activeId={activeId}
          setActiveId={setActiveId}
          setIsOpen={setIsOpen}
          parentPath={parentPath}
        />
      ))}
    </div>
  );
});

// ================= MAIN =================
export default function CategoryTree({ initialData = [], setIsOpen }) {
  const [activeRootId, setActiveRootId] = useState(null);

  return (
    <div className="p-2">
      {/* Header */}
      <div className="px-3 py-2 mb-2 text-sm font-semibold text-gray-300 border-b-2 ">
        Categories
      </div>

      {/* Root */}
      <div className="space-y-1">
        {initialData.map((cat) => (
          <CategoryItem
            key={cat.id}
            category={cat}
            level={0}
            activeId={activeRootId}
            setActiveId={setActiveRootId}
            setIsOpen={setIsOpen}
            parentPath=""
          />
        ))}
      </div>

      {/* Extra */}
      <div className="border-t mt-3 bg-black pt-2 text-sm text-gray-300 absolute bottom-10 left-0 w-full md:hidden">
        <Link
          className="px-8 py-2 hover:bg-slate-800 rounded-lg"
          href="/tracking"
        >
          Order Tracking
        </Link>

        <div className="px-3  hover:bg-slate-800 rounded-lg">
          <ThemeToggle sun="Light Mode" moon="Dark Mode" />
        </div>
        <div className="px-8  hover:bg-slate-800 rounded-lg">
          <Logout className="flex flex-row gap-2 items-center">Sign Out</Logout>
        </div>
      </div>
    </div>
  );
}
