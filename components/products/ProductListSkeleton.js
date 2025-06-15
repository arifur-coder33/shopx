// A simple skeleton to reserve space and show a loading state
export default function ProductListSkeleton() {
  return (
    <div className="mt-4 sm:mt-6 space-y-8">
      {/* Create a couple of fake category blocks */}
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-md border-2 border-b-4 p-2 animate-pulse">
          <div className="h-8 w-1/3 bg-gray-200 rounded-md mb-4"></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {/* Create a few fake product cards */}
            {[...Array(5)].map((_, j) => (
              <div key={j} className="space-y-2">
                <div className="aspect-square bg-gray-200 rounded-md"></div>
                <div className="h-4 bg-gray-200 rounded-md w-full"></div>
                <div className="h-4 bg-gray-200 rounded-md w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}