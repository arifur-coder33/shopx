"use client";

import { trackEvent } from "@/lib/SocialEventTracking";
import { EVENTS } from "@/lib/SocialEventTracking/events";
import { normalizeText } from "@/utils/normalize";
import { Search } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Imagecustom from "../images/ImageCustom";
export default function SearchBox() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();
  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      const normalizedQuery = normalizeText(query);
      trackEvent({
        event: EVENTS.SEARCH,
        user: {
          email: session?.user?.email,
          phone: session?.user?.phone,
        },
        src: `/search?q=${query}`,
        extra: {
          search_string: query,
        },
      });
      const res = await fetch(`/api/searchProduct?q=${normalizedQuery}`);
      const data = await res.json();

      setResults(data.products);
      setLoading(false);
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [query, session]);

  const handleSearch = () => {
    if (!query) return;
    setQuery("");
    router.push(`/search?q=${query}`);
  };

  return (
    <div className="relative w-full max-w-md">
      {/* 🔍 Input + Icon */}
      <div className="flex items-center border rounded-full px-4 py-2 bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-500">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search products..."
          className="flex-1 outline-none text-sm text-black bg-transparent"
        />
        <Link
          href={`/search?q=${query}`}
          className="p-1"
          onClick={() => setQuery("")}
        >
          <Search className="w-5 h-5 text-gray-500 hover:text-black" />
        </Link>
      </div>

      {/* 🔽 Dropdown */}
      {query && (
        <div className="absolute top-full left-0 w-full bg-black opacity-90 shadow-xl rounded-xl mt-2 z-50 overflow-hidden border">
          {loading && <p className="p-3">Loading...</p>}

          {!loading && results.length === 0 && (
            <p className="p-3 ">No results found</p>
          )}

          {/* 🔹 Results */}
          {!loading && results.length > 0 && (
            <>
              {results.map((item) => (
                <Link
                  onClick={() => setQuery("")}
                  key={item.id}
                  href={`/product/${item.slug}`}
                  className="flex items-center gap-3 p-3 hover:bg-gray-800 transition"
                >
                  {item.thumbnail ? (
                    <Imagecustom
                      w={40}
                      h={40}
                      src={item.thumbnail.name}
                      alt={item.title}
                      className="w-10 h-10 object-cover rounded-md border"
                      unoptimized
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-200 rounded-md" />
                  )}

                  <span className="text-sm line-clamp-1">{item.title}</span>
                </Link>
              ))}

              {/* 🔥 View All */}
              <div className="w-full text-center text-sm font-medium py-2 border-t">
                <Link
                  onClick={() => setQuery("")}
                  className="text-blue-500 hover:text-blue-400 transition-transform"
                  href={`/search?q=${query}`}
                >
                  View all results
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
