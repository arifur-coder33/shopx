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

// "use client";

// import { trackEvent } from "@/lib/SocialEventTracking";
// import { EVENTS } from "@/lib/SocialEventTracking/events";
// import { normalizeText } from "@/utils/normalize";
// import { Search, X } from "lucide-react";
// import { useSession } from "next-auth/react";
// import Link from "next/link";
// import { useRouter } from "next/navigation";
// import { useEffect, useState } from "react";
// import Imagecustom from "../images/ImageCustom";

// export default function SearchBox() {
//   const [query, setQuery] = useState("");
//   const [results, setResults] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

//   const router = useRouter();
//   const { data: session } = useSession();

//   useEffect(() => {
//     if (!query) {
//       setResults([]);
//       return;
//     }

//     const delayDebounce = setTimeout(async () => {
//       setLoading(true);

//       try {
//         const normalizedQuery = normalizeText(query);

//         trackEvent({
//           event: EVENTS.SEARCH,
//           user: {
//             email: session?.user?.email,
//             phone: session?.user?.phone,
//           },
//           src: `/search?q=${query}`,
//           extra: {
//             search_string: query,
//           },
//         });

//         const res = await fetch(`/api/searchProduct?q=${normalizedQuery}`);
//         const data = await res.json();

//         setResults(data.products || []);
//       } finally {
//         setLoading(false);
//       }
//     }, 250);

//     return () => clearTimeout(delayDebounce);
//   }, [query, session]);

//   const handleSearch = () => {
//     if (!query.trim()) return;

//     const searchQuery = query;

//     setQuery("");
//     setResults([]);
//     setIsMobileSearchOpen(false);

//     router.push(`/search?q=${searchQuery}`);
//   };

//   const closeMobileSearch = () => {
//     setIsMobileSearchOpen(false);
//     setQuery("");
//     setResults([]);
//   };

//   const SearchResults = () => (
//     <div className="absolute top-full left-0 w-full bg-black/90 shadow-xl rounded-xl mt-2 z-50 overflow-hidden border">
//       {loading && <p className="p-3 text-white">Loading...</p>}

//       {!loading && results.length === 0 && (
//         <p className="p-3 text-white">No results found</p>
//       )}

//       {!loading && results.length > 0 && (
//         <>
//           {results.map((item) => (
//             <Link
//               key={item.id}
//               href={`/product/${item.slug}`}
//               onClick={() => {
//                 setQuery("");
//                 setResults([]);
//                 setIsMobileSearchOpen(false);
//               }}
//               className="flex items-center gap-3 p-3 hover:bg-gray-800 transition"
//             >
//               {item.thumbnail ? (
//                 <Imagecustom
//                   w={40}
//                   h={40}
//                   src={item.thumbnail.name}
//                   alt={item.title}
//                   className="w-10 h-10 object-cover rounded-md border"
//                   unoptimized
//                 />
//               ) : (
//                 <div className="w-10 h-10 bg-gray-200 rounded-md" />
//               )}

//               <span className="text-sm text-white line-clamp-1">
//                 {item.title}
//               </span>
//             </Link>
//           ))}

//           <div className="w-full text-center text-sm font-medium py-2 border-t border-gray-700">
//             <Link
//               href={`/search?q=${query}`}
//               onClick={() => {
//                 setQuery("");
//                 setResults([]);
//                 setIsMobileSearchOpen(false);
//               }}
//               className="text-blue-400 hover:text-blue-300"
//             >
//               View all results
//             </Link>
//           </div>
//         </>
//       )}
//     </div>
//   );

//   return (
//     <>
//       {/* ================= Desktop ================= */}
//       <div className="hidden md:block relative w-full max-w-md">
//         <div className="flex items-center border rounded-full px-4 py-2 bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-500">
//           <input
//             type="text"
//             value={query}
//             onChange={(e) => setQuery(e.target.value)}
//             onKeyDown={(e) => e.key === "Enter" && handleSearch()}
//             placeholder="Search products..."
//             className="flex-1 outline-none text-sm text-black bg-transparent"
//           />

//           <button onClick={handleSearch} className="p-1">
//             <Search className="w-5 h-5 text-gray-500 hover:text-black" />
//           </button>
//         </div>

//         {query && <SearchResults />}
//       </div>

//       {/* ================= Mobile ================= */}
//       <div className="md:hidden">
//         <button
//           onClick={() => setIsMobileSearchOpen(true)}
//           className="p-2"
//           aria-label="Open Search"
//         >
//           <Search className="w-6 h-6" />
//         </button>
//       </div>

//       {/* ================= Mobile Overlay ================= */}
//       {isMobileSearchOpen && (
//         <div className="fixed inset-0 z-[999] bg-black/40 md:hidden">
//           <div className="bg-slate-900/95 p-3 shadow-lg">
//             <div className="flex items-center gap-2">
//               <input
//                 autoFocus
//                 type="text"
//                 value={query}
//                 onChange={(e) => setQuery(e.target.value)}
//                 onKeyDown={(e) => e.key === "Enter" && handleSearch()}
//                 placeholder="Search products..."
//                 className="flex-1 border rounded-full px-4 py-2 outline-none"
//               />

//               <button
//                 onClick={closeMobileSearch}
//                 className="p-2"
//                 aria-label="Close Search"
//               >
//                 <X className="w-6 h-6" />
//               </button>
//             </div>

//             <div className="relative">{query && <SearchResults />}</div>
//           </div>

//           {/* Click outside to close */}
//           <div className="flex-1 h-full" onClick={closeMobileSearch} />
//         </div>
//       )}
//     </>
//   );
// }
