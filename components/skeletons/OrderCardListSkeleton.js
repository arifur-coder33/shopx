export default function OrderCardListSkeleton() {
  return (
    <div className="space-y-4 flex flex-col">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-100 flex justify-between">
            <div className="space-y-2">
              <div className="h-4 w-32 bg-gray-200 rounded"></div>
              <div className="h-3 w-48 bg-gray-200 rounded"></div>
            </div>
            <div className="h-6 w-24 bg-gray-200 rounded"></div>
          </div>

          {/* Items */}
          <div className="divide-y divide-gray-100">
            {[...Array(2)].map((_, j) => (
              <div
                key={j}
                className="p-6 flex flex-col md:grid md:grid-cols-12 gap-4 items-center"
              >
                {/* Product */}
                <div className="col-span-6 flex items-center gap-4 w-full">
                  <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>

                  <div className="space-y-2 w-full">
                    <div className="h-4 w-40 bg-gray-200 rounded"></div>
                    <div className="h-3 w-24 bg-gray-200 rounded"></div>
                  </div>
                </div>

                {/* Price */}
                <div className="col-span-2 w-full md:text-center">
                  <div className="h-4 w-16 bg-gray-200 rounded mx-auto"></div>
                </div>

                {/* Qty */}
                <div className="col-span-2 w-full md:text-center">
                  <div className="h-4 w-10 bg-gray-200 rounded mx-auto"></div>
                </div>

                {/* Total */}
                <div className="col-span-2 w-full md:text-right">
                  <div className="h-4 w-20 bg-gray-200 rounded ml-auto"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Next Button Skeleton */}
      <div className="flex justify-end mt-4">
        <div className="h-10 w-24 bg-gray-200 rounded animate-pulse"></div>
      </div>
    </div>
  );
}
