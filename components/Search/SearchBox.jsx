"use client";

import { trackEvent } from "@/lib/SocialEventTracking";
import { EVENTS } from "@/lib/SocialEventTracking/events";
import { normalizeText } from "@/utils/normalize";
import { Search, X } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Imagecustom from "../images/ImageCustom";

export default function SearchBox() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    const close = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  useEffect(() => {
    const searchText = query.trim();
    if (!searchText) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const delay = setTimeout(async () => {
      setLoading(true);
      try {
        const normalizedQuery = normalizeText(searchText);
        const response = await fetch(
          `/api/searchProduct?q=${encodeURIComponent(normalizedQuery)}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("Search request failed");
        const data = await response.json();
        setResults(data.products ?? []);

        trackEvent({
          event: EVENTS.SEARCH,
          user: {
            email: session?.user?.email,
            phone: session?.user?.phone,
          },
          src: `/search?q=${encodeURIComponent(searchText)}`,
          extra: { search_string: searchText },
        });
      } catch (error) {
        if (error.name !== "AbortError") setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(delay);
      controller.abort();
    };
  }, [query, session?.user?.email, session?.user?.phone]);

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  const handleSearch = () => {
    const searchText = query.trim();
    if (!searchText) return;
    clearSearch();
    router.push(`/search?q=${encodeURIComponent(searchText)}`);
  };

  return (
    <div ref={rootRef} className="relative mx-auto w-full max-w-2xl">
      <div className="flex h-11 items-center overflow-hidden rounded-brand border border-border bg-background shadow-sm transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 sm:h-12">
        <Search aria-hidden="true" className="ml-3 h-5 w-5 shrink-0 text-text-muted" />
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => query.trim() && setOpen(true)}
          onKeyDown={(event) => event.key === "Enter" && handleSearch()}
          placeholder="কী খুঁজছেন?"
          aria-label="পণ্য খুঁজুন"
          aria-expanded={open && Boolean(query.trim())}
          className="h-full min-h-0 min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-text outline-none placeholder:text-text-muted focus:ring-0 sm:text-base"
        />
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            aria-label="খোঁজা মুছুন"
            className="flex h-10 w-10 shrink-0 items-center justify-center text-text-muted hover:text-text"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={handleSearch}
          className="hidden h-full shrink-0 items-center bg-primary px-5 font-semibold text-white transition hover:bg-primary-hover sm:flex"
        >
          খুঁজুন
        </button>
      </div>

      {open && query.trim() && (
        <div className="absolute left-0 top-full z-50 mt-2 max-h-[min(28rem,70dvh)] w-full overflow-y-auto rounded-brand border border-border bg-surface p-1.5 text-text shadow-2xl">
          {loading && (
            <div className="flex items-center gap-3 px-3 py-4 text-sm text-text-muted">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
              পণ্য খোঁজা হচ্ছে…
            </div>
          )}

          {!loading && results.length === 0 && (
            <p className="px-3 py-5 text-center text-sm text-text-muted">
              “{query.trim()}” নামে কোনো পণ্য পাওয়া যায়নি
            </p>
          )}

          {!loading && results.map((item) => (
            <Link
              onClick={clearSearch}
              key={item.id}
              href={`/product/${item.slug}`}
              className="flex min-h-16 items-center gap-3 rounded-brand px-2 py-2 transition hover:bg-primary-soft"
            >
              {item.thumbnail ? (
                <Imagecustom
                  w={48}
                  h={48}
                  src={item.thumbnail.name}
                  alt={item.title}
                  className="h-12 w-12 shrink-0 rounded-md border border-border object-cover"
                  unoptimized
                />
              ) : (
                <div className="h-12 w-12 shrink-0 rounded-md bg-surface-muted" />
              )}
              <span className="line-clamp-2 min-w-0 flex-1 text-sm font-medium leading-5">
                {item.title}
              </span>
            </Link>
          ))}

          {!loading && results.length > 0 && (
            <button
              type="button"
              onClick={handleSearch}
              className="mt-1 flex min-h-11 w-full items-center justify-center rounded-brand border-t border-border px-3 pt-2 text-sm font-semibold text-primary hover:bg-primary-soft"
            >
              সব ফলাফল দেখুন
            </button>
          )}
        </div>
      )}
    </div>
  );
}
