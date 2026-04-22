

// "use client";

// import { useEffect, useRef, useState } from "react";
// import Link from "next/link";
// import Fuse from "fuse.js";
// import { normalizeText } from "@/utils/normalize";

// export default function SearchBox() {
//   const [query, setQuery] = useState("");
//   const [results, setResults] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [open, setOpen] = useState(false);
//   const debounceRef = useRef(null);

//   useEffect(() => {
//     if (!query) {
//       setResults([]);
//       setOpen(false);
//       return;
//     }

//     clearTimeout(debounceRef.current);

//     debounceRef.current = setTimeout(async () => {
//       try {
//         setLoading(true);

//         const q = normalizeText(query);
//         const res = await fetch(`/api/searchProduct?q=${q}`);
//         const data = await res.json();

//         // 🔥 Fuzzy refine
//         const fuse = new Fuse(data, {
//           keys: ["title"],
//           threshold: 0.4,
//         });

//         const finalResults = q
//           ? fuse.search(q).map((r) => r.item)
//           : data;

//         setResults(finalResults);
//         setOpen(true);
//       } catch (err) {
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     }, 250);
//   }, [query]);

//   return (
//     <div className="relative w-full max-w-md">
//       <input
//         type="text"
//         value={query}
//         onChange={(e) => setQuery(e.target.value)}
//         placeholder="Search products..."
//         className="w-full px-4 py-2 rounded-lg text-black outline-none"
//       />

//       {open && query && (
//         <div className="absolute top-full left-0 w-full bg-white text-black shadow-lg rounded-lg mt-1 max-h-80 overflow-y-auto z-50">
//           {loading && <div className="p-3 text-sm">Loading...</div>}

//           {!loading && results.length === 0 && (
//             <div className="p-3 text-sm">No product found</div>
//           )}

//           {results.map((item) => (
//             <Link
//               key={item.id}
//               href={`/product/${item.slug}`}
//               className="block p-3 hover:bg-gray-100"
//               onClick={() => setOpen(false)}
//             >
//               {item.title}
//             </Link>
//           ))}

//           {!loading && results.length > 0 && (
//             <Link
//               href={`/search?q=${query}`}
//               className="block p-3 bg-gray-100 hover:bg-gray-200"
//               onClick={() => setOpen(false)}
//             >
//               View all results
//             </Link>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }


 "use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function SearchBox() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);

     const res = await fetch(`/api/searchProduct?q=${query}`);
      const data = await res.json();

      setResults(data.products);
      setLoading(false);
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  return (
    <div className="relative w-full max-w-md">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products..."
        className="w-full border rounded-lg px-4 py-2 text-black"
      />

      {query && (
        <div className="absolute top-full left-0 w-full bg-slate-500 text-black shadow-lg rounded-lg mt-2 z-50">
          {loading && <p className="p-3 text-sm">Loading...</p>}

          {!loading && results.length === 0 && (
            <p className="p-3 text-sm">No results</p>
          )}

          {results.map((item) => (
            <Link
              key={item.id}
              href={`/product/${item.slug}`}
              className="flex items-center gap-3 p-3 hover:bg-gray-100"
            >
              {item.thumbnail?.url && (
                <img
                  src={item.thumbnail.url}
                  alt={item.title}
                  className="w-10 h-10 object-cover rounded"
                />
              )}
              <span className="text-sm">{item.title}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}