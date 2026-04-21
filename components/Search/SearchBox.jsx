

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Fuse from "fuse.js";
import { normalizeText } from "@/utils/normalize";

export default function SearchBox() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!query) {
      setResults([]);
      setOpen(false);
      return;
    }

    clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        setLoading(true);

        const q = normalizeText(query);
        const res = await fetch(`/api/searchProduct?q=${q}`);
        const data = await res.json();

        // 🔥 Fuzzy refine
        const fuse = new Fuse(data, {
          keys: ["title"],
          threshold: 0.4,
        });

        const finalResults = q
          ? fuse.search(q).map((r) => r.item)
          : data;

        setResults(finalResults);
        setOpen(true);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 250);
  }, [query]);

  return (
    <div className="relative w-full max-w-md">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products..."
        className="w-full px-4 py-2 rounded-lg text-black outline-none"
      />

      {open && query && (
        <div className="absolute top-full left-0 w-full bg-white text-black shadow-lg rounded-lg mt-1 max-h-80 overflow-y-auto z-50">
          {loading && <div className="p-3 text-sm">Loading...</div>}

          {!loading && results.length === 0 && (
            <div className="p-3 text-sm">No product found</div>
          )}

          {results.map((item) => (
            <Link
              key={item.id}
              href={`/product/${item.slug}`}
              className="block p-3 hover:bg-gray-100"
              onClick={() => setOpen(false)}
            >
              {item.title}
            </Link>
          ))}

          {!loading && results.length > 0 && (
            <Link
              href={`/search?q=${query}`}
              className="block p-3 bg-gray-100 hover:bg-gray-200"
              onClick={() => setOpen(false)}
            >
              View all results
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

