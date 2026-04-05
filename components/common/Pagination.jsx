import Link from "next/link";

export default function Pagination({ pagination, basePath }) {
  const { page, totalPages } = pagination;

  return (
    <div className="flex justify-center gap-2 mt-6">
      {/* Prev */}
      {page > 1 && (
        <Link href={`${basePath}/${page - 1}`}>
          <button className="px-3 py-1 border rounded">Prev</button>
        </Link>
      )}

      {/* Pages */}
      {[...Array(totalPages)].map((_, i) => (
        <Link key={i} href={`${basePath}/${i + 1}`}>
          <button
            className={`px-3 py-1 border rounded ${
              page === i + 1 ? "bg-brand text-white" : ""
            }`}
          >
            {i + 1}
          </button>
        </Link>
      ))}

      {/* Next */}
      {page < totalPages && (
        <Link href={`${basePath}/${page + 1}`}>
          <button className="px-3 py-1 border rounded">Next</button>
        </Link>
      )}
    </div>
  );
}
