"use client";

import Logout from "@/components/auth/Logout";
import ThemeToggle from "@/components/TheamToggle";
import { ChevronDown, ChevronRight, FolderTree, PackageSearch } from "lucide-react";
import Link from "next/link";
import { memo, useState } from "react";

function buildCategoryPath(category, parentPath = "") {
  return parentPath ? `${parentPath}/${category.slug}` : category.slug;
}

const CategoryItem = memo(function CategoryItem({
  category,
  level = 0,
  activeId,
  setActiveId,
  setIsOpen,
  parentPath = "",
}) {
  const hasChildren = category.subCategories?.length > 0;
  const expanded = activeId === category.id;
  const fullPath = buildCategoryPath(category, parentPath);

  return (
    <div className={level === 0 ? "rounded-2xl border border-border bg-surface shadow-sm" : ""}>
      <div className="group flex min-h-12 items-center gap-2 rounded-xl px-2 transition-colors hover:bg-primary-soft">
        {level === 0 && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <FolderTree className="h-4 w-4" aria-hidden="true" />
          </span>
        )}

        <Link
          href={`/category/${fullPath}`}
          onClick={() => setIsOpen?.(false)}
          className="min-w-0 flex-1 py-3 text-sm font-semibold text-text transition-colors group-hover:text-primary"
        >
          <span className="block truncate">{category.name}</span>
        </Link>

        {hasChildren ? (
          <button
            type="button"
            aria-label={`${category.name} এর উপবিভাগ ${expanded ? "বন্ধ" : "খুলুন"}`}
            aria-expanded={expanded}
            onClick={() => setActiveId(expanded ? null : category.id)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface hover:text-primary"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-text-muted/50" aria-hidden="true" />
        )}
      </div>

      {hasChildren && expanded && (
        <SubList
          categories={category.subCategories}
          level={level + 1}
          setIsOpen={setIsOpen}
          parentPath={fullPath}
        />
      )}
    </div>
  );
});

const SubList = memo(function SubList({ categories, level, setIsOpen, parentPath = "" }) {
  const [activeId, setActiveId] = useState(null);

  return (
    <div className="mb-2 ml-6 mr-2 space-y-1 border-l border-border pl-2">
      {categories.map((category) => (
        <CategoryItem
          key={category.id}
          category={category}
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

export default function CategoryTree({ initialData = [], setIsOpen }) {
  const [activeRootId, setActiveRootId] = useState(null);

  return (
    <div className="flex min-h-full flex-col px-1">
      <div className="mb-4 flex items-center gap-3 border-b border-border px-2 pb-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <PackageSearch className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-text">পণ্য বিভাগ</h2>
          <p className="text-xs text-text-muted">আপনার প্রয়োজনীয় পণ্য খুঁজুন</p>
        </div>
      </div>

      <nav aria-label="পণ্য বিভাগ" className="flex-1 space-y-2 pb-5">
        {initialData.length === 0 && (
          <p className="rounded-2xl border border-border bg-surface-muted p-4 text-sm text-text-muted">
            বিভাগগুলো এখন দেখানো যাচ্ছে না। একটু পরে আবার চেষ্টা করুন।
          </p>
        )}
        {initialData.map((category) => (
          <CategoryItem
            key={category.id}
            category={category}
            activeId={activeRootId}
            setActiveId={setActiveRootId}
            setIsOpen={setIsOpen}
          />
        ))}
      </nav>

      <div className="mt-auto space-y-1 border-t border-border bg-surface px-2 pt-3 text-sm text-text md:hidden">
        <Link
          className="block rounded-xl px-3 py-3 font-medium transition-colors hover:bg-primary-soft hover:text-primary"
          href="/tracking"
          onClick={() => setIsOpen?.(false)}
        >
          অর্ডার ট্র্যাক করুন
        </Link>
        <div className="rounded-xl px-3 transition-colors hover:bg-primary-soft">
          <ThemeToggle
            showOnMobile
            sun="Light Mode"
            moon="Dark Mode"
            buttonClassName="w-full justify-start gap-2 px-3 text-text"
          />
        </div>
        <div className="rounded-xl px-3 transition-colors hover:bg-primary-soft">
          <Logout className="flex items-center gap-2">Sign Out</Logout>
        </div>
      </div>
    </div>
  );
}
