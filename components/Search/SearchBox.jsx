"use client";

import { trackEvent } from "@/lib/SocialEventTracking";
import { EVENTS } from "@/lib/SocialEventTracking/events";
import { searchProductSuggestions } from "@/backend/serverActions/productActions";
import { Camera, ChevronUp, Search, X } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Imagecustom from "../images/ImageCustom";

export default function SearchBox() {
  const resultsId = "product-search-results";
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [imageSearchLoading, setImageSearchLoading] = useState(false);
  const [imageSearchEnabled, setImageSearchEnabled] = useState(false);
  const [imageResultIds, setImageResultIds] = useState([]);
  const [imageSimilarFallback, setImageSimilarFallback] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [imageError, setImageError] = useState("");
  const [open, setOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const rootRef = useRef(null);
  const imageInputRef = useRef(null);
  const imagePreviewRef = useRef("");
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    let active = true;
    fetch("/api/searchProduct/image", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => { if (active) setImageSearchEnabled(Boolean(data.enabled)); })
      .catch(() => { if (active) setImageSearchEnabled(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => () => {
    if (imagePreviewRef.current) URL.revokeObjectURL(imagePreviewRef.current);
  }, []);

  useEffect(() => {
    const close = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
        setMobileExpanded(false);
      }
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  useEffect(() => {
    const searchText = query.trim();
    if (imageResultIds.length) return;
    if (!searchText) {
      setResults([]);
      setLoading(false);
      return;
    }

    let active = true;
    const delay = setTimeout(async () => {
      if (active) setLoading(true);
      try {
        const data = await searchProductSuggestions(searchText);
        if (!active) return;
        setResults(data.products ?? []);
        setImageResultIds(data.allProductIds ?? (data.products || []).map((item) => item.id));

        trackEvent({
          event: EVENTS.SEARCH,
          user: {
            email: session?.user?.email,
            phone: session?.user?.phone,
          },
          src: `/search?q=${encodeURIComponent(searchText)}`,
          extra: { search_string: searchText },
        });
      } catch {
        if (active) setResults([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 180);

    return () => {
      active = false;
      clearTimeout(delay);
    };
  }, [query, imageResultIds.length, session?.user?.email, session?.user?.phone]);

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setImageResultIds([]);
    setImageSimilarFallback(false);
    if (imagePreviewRef.current) URL.revokeObjectURL(imagePreviewRef.current);
    imagePreviewRef.current = "";
    setImagePreviewUrl("");
    setImageError("");
    setOpen(false);
  };

  const handleImageSelected = async (event) => {
    const image = event.target.files?.[0];
    event.target.value = "";
    if (!image) return;
    if (imagePreviewRef.current) URL.revokeObjectURL(imagePreviewRef.current);
    imagePreviewRef.current = URL.createObjectURL(image);
    setImagePreviewUrl(imagePreviewRef.current);
    const formData = new FormData();
    formData.set("image", image);
    setQuery("");
    setResults([]);
    setImageResultIds([]);
    setImageSimilarFallback(false);
    setLoading(false);
    setImageSearchLoading(true);
    setImageError("");
    setOpen(true);
    try {
      const response = await fetch("/api/searchProduct/image", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "ছবি দিয়ে পণ্য খোঁজা যায়নি।");
      setImageResultIds(data.allProductIds || (data.products || []).map((product) => product.id));
      setImageSimilarFallback(Boolean(data.similarFallback));
      setResults(data.products || []);
      setQuery(data.query || "ছবি দিয়ে খোঁজা ফলাফল");
      if (!data.products?.length) setImageError("ছবির সঙ্গে মেলে এমন কোনো পণ্য পাওয়া যায়নি।");
    } catch (error) {
      setImageResultIds([]);
      setImageSimilarFallback(false);
      setImageError(error.message || "ছবি দিয়ে পণ্য খোঁজা যায়নি।");
    } finally {
      setImageSearchLoading(false);
    }
  };

  const handleSearch = () => {
    const searchText = query.trim();
    if (!searchText && !imageResultIds.length) return;
    if (imageResultIds.length) {
      setOpen(false);
      setMobileExpanded(false);
      const similarParam = imageSimilarFallback ? "&similar=1" : "";
      router.push(`/search?ids=${encodeURIComponent(imageResultIds.join(","))}&q=${encodeURIComponent(searchText)}${similarParam}`);
      return;
    }
    clearSearch();
    setMobileExpanded(false);
    router.push(`/search?q=${encodeURIComponent(searchText)}`);
  };

  return (
    <div ref={rootRef} className="relative mx-auto w-auto md:w-full md:max-w-2xl" onKeyDown={(event) => event.key === "Escape" && setMobileExpanded(false)}>
      <button type="button" onClick={() => setMobileExpanded(true)} aria-label="পণ্য খুঁজুন" aria-expanded={mobileExpanded} className={`grid h-9 w-9 place-items-center rounded-full text-text-muted transition hover:bg-primary-soft hover:text-primary md:hidden ${mobileExpanded ? "invisible pointer-events-none" : ""}`}><Search aria-hidden="true" className="h-5 w-5" /></button>
      <div className={`h-11 items-center overflow-hidden rounded-brand border border-border bg-background shadow-lg transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 sm:h-12 ${mobileExpanded ? "fixed left-2 right-2 top-16 z-50 mt-0 flex w-auto origin-center animate-[search-expand_260ms_ease-out]" : "hidden"} md:static md:left-auto md:right-auto md:top-auto md:mt-0 md:flex md:w-full md:translate-x-0 md:shadow-sm`}>
        <Search aria-hidden="true" className="ml-3 h-5 w-5 shrink-0 text-text-muted" />
        {imageSearchEnabled && <>
          <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" aria-label="ছবি দিয়ে পণ্য খুঁজুন" onChange={handleImageSelected} />
          <button type="button" onClick={() => imageInputRef.current?.click()} disabled={imageSearchLoading} aria-label="ছবি দিয়ে পণ্য খুঁজুন" title="ছবি দিয়ে পণ্য খুঁজুন" className="ml-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-text-muted transition hover:bg-primary-soft hover:text-primary disabled:opacity-50">
            {imageSearchLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" /> : <Camera className="h-4 w-4" />}
          </button>
        </>}
        <input
          type="text"
          inputMode="search"
          value={query}
          onChange={(event) => {
            setImageResultIds([]);
            setImageSimilarFallback(false);
            if (imagePreviewRef.current) URL.revokeObjectURL(imagePreviewRef.current);
            imagePreviewRef.current = "";
            setImagePreviewUrl("");
            setImageError("");
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => query.trim() && setOpen(true)}
          onKeyDown={(event) => event.key === "Enter" && handleSearch()}
          placeholder="কী খুঁজছেন?"
          aria-label="পণ্য খুঁজুন"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={resultsId}
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
        {mobileExpanded && <button type="button" onClick={() => { setOpen(false); setMobileExpanded(false); }} aria-label="Search বন্ধ করুন" className="flex h-10 w-10 shrink-0 items-center justify-center text-text-muted hover:text-text md:hidden"><ChevronUp className="h-4 w-4" /></button>}
        <button
          type="button"
          onClick={handleSearch}
          className="hidden h-full shrink-0 items-center bg-primary-hover px-5 font-semibold text-white transition hover:brightness-90 sm:flex"
        >
          খুঁজুন
        </button>
      </div>

      {open && (query.trim() || imageSearchLoading || imageError) && (
        <div
          id={resultsId}
          role="listbox"
          aria-label="পণ্য খোঁজার ফলাফল"
          className={`absolute z-50 mt-2 max-h-[min(28rem,70dvh)] overflow-y-auto rounded-brand border border-border bg-surface p-1.5 text-text shadow-2xl ${mobileExpanded ? "fixed left-2 top-[7.25rem] w-[calc(100vw-1rem)] md:absolute md:left-0 md:top-full md:w-full" : "left-0 top-full w-full"}`}
        >
          {loading && (
            <div className="flex items-center gap-3 px-3 py-4 text-sm text-text-muted">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
              পণ্য খোঁজা হচ্ছে…
            </div>
          )}

          {!loading && !imageSearchLoading && results.length === 0 && (
            <p className="px-3 py-5 text-center text-sm text-text-muted">
              {imageError || `“${query.trim()}” নামে কোনো পণ্য পাওয়া যায়নি`}
            </p>
          )}

          {imagePreviewUrl && <div className="flex items-center gap-3 border-b border-border px-2 py-2"><img src={imagePreviewUrl} alt="আপনার খোঁজার ছবি" className="h-12 w-12 shrink-0 rounded-md object-cover" /><p className="text-sm text-text-muted">{imageSearchLoading ? "Searching similar products" : imageSimilarFallback ? "Similar photo results" : "Photo search results"}</p></div>}

          {!loading && !imageSearchLoading && results.map((item) => (
            <Link
              onClick={clearSearch}
              key={item.id}
              href={`/product/${item.slug}`}
              role="option"
              aria-selected="false"
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
                {item.matchType === "similar" && <span className="mt-0.5 block text-xs font-normal text-text-muted">ছবির মতো similar product</span>}
              </span>
            </Link>
          ))}

          {!loading && !imageSearchLoading && results.length > 0 && (
            <>
              {imageSimilarFallback && <p className="px-3 pt-2 text-center text-xs text-text-muted">ছবির মতো similar product</p>}
              <button
                type="button"
                onClick={handleSearch}
                className="mt-1 flex min-h-11 w-full items-center justify-center rounded-brand border-t border-border px-3 pt-2 text-sm font-semibold text-primary hover:bg-primary-soft"
              >
                সব ফলাফল দেখুন
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
