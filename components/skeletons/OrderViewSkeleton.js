// app/admin/orders/_components/skeletons/OrderViewSkeleton.js
export default function OrderViewSkeleton() {
  return (
    <div className="space-y-4 flex flex-col">
      {/* Order Header Skeleton */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-200 rounded-xl"></div>
          <div className="space-y-2">
            <div className="w-40 h-5 bg-gray-200 rounded"></div>
            <div className="w-28 h-3 bg-gray-200 rounded"></div>
          </div>
        </div>
        <div className="mt-4 md:mt-0 w-24 h-6 bg-gray-200 rounded-full"></div>
      </div>

      {/* Customer Info Skeleton */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-pulse space-y-4">
        {[...Array(4)].map((_, idx) => (
          <div key={idx} className="flex items-start gap-3">
            <div className="w-5 h-5 bg-gray-200 rounded-full mt-1"></div>
            <div className="space-y-1 flex-1">
              <div className="w-32 h-3 bg-gray-200 rounded"></div>
              <div className="w-40 h-4 bg-gray-300 rounded"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Order Items Table Skeleton */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
        <div className="p-6 space-y-4">
          {[...Array(3)].map((_, idx) => (
            <div
              key={idx}
              className="flex flex-col md:flex-row md:gap-4 items-center gap-3"
            >
              <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
              <div className="flex-1 space-y-2 w-full">
                <div className="w-32 h-4 bg-gray-200 rounded"></div>
                <div className="w-20 h-3 bg-gray-300 rounded"></div>
              </div>
              <div className="w-16 h-4 bg-gray-200 rounded"></div>
              <div className="w-16 h-4 bg-gray-200 rounded"></div>
              <div className="w-16 h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Order Summary Skeleton */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-pulse space-y-3">
        {[...Array(3)].map((_, idx) => (
          <div key={idx} className="w-full h-4 bg-gray-200 rounded"></div>
        ))}
        <div className="w-1/3 h-6 bg-gray-300 rounded mt-3"></div>
      </div>

      {/* Invoice Skeleton */}
      <div className="w-32 h-10 bg-gray-200 rounded-full animate-pulse"></div>

      {/* Order Timeline Skeleton */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-pulse space-y-6">
        {[...Array(4)].map((_, idx) => (
          <div key={idx} className="flex items-start gap-4">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-1">
              <div className="w-32 h-3 bg-gray-200 rounded"></div>
              <div className="w-40 h-2 bg-gray-300 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
