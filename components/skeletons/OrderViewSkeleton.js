import {
  SkeletonButton,
  SkeletonCircle,
  SkeletonImage,
  SkeletonText,
} from "@/components/skeletons/_components/Index";

export default function OrderViewSkeleton() {
  return (
    <div className="space-y-4 flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border">
        <div className="flex items-center gap-4">
          <SkeletonImage size="w-12 h-12" />
          <div className="space-y-2">
            <SkeletonText width="w-40" />
            <SkeletonText width="w-28" height="h-3" />
          </div>
        </div>
        <div className="mt-4 md:mt-0">
          <SkeletonText width="w-24" height="h-6" />
        </div>
      </div>

      {/* Customer */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <SkeletonCircle size="w-5 h-5" />
            <div className="space-y-1 flex-1">
              <SkeletonText width="w-32" height="h-3" />
              <SkeletonText width="w-40" />
            </div>
          </div>
        ))}
      </div>

      {/* Items */}
      <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <SkeletonImage />
            <div className="flex-1 space-y-2">
              <SkeletonText width="w-32" />
              <SkeletonText width="w-20" height="h-3" />
            </div>
            <SkeletonText width="w-16" />
            <SkeletonText width="w-16" />
            <SkeletonText width="w-16" />
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-3">
        {[...Array(3)].map((_, i) => (
          <SkeletonText key={i} />
        ))}
        <SkeletonText width="w-1/3" height="h-6" />
      </div>

      {/* Button */}
      <SkeletonButton width="w-32" />

      {/* Timeline */}
      <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-start gap-4">
            <SkeletonCircle />
            <div className="flex-1 space-y-1">
              <SkeletonText width="w-32" height="h-3" />
              <SkeletonText width="w-40" height="h-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
