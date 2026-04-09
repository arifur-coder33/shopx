import {
  SkeletonButton,
  SkeletonImage,
  SkeletonText,
} from "@/components/skeletons/_components";

export default function OrderCardListSkeleton() {
  return (
    <div className="space-y-4 flex flex-col">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6 space-y-4"
        >
          {/* Header */}
          <div className="flex justify-between">
            <div className="space-y-2">
              <SkeletonText width="w-32" />
              <SkeletonText width="w-48" height="h-3" />
            </div>
            <SkeletonText width="w-24" height="h-6" />
          </div>

          {/* Items */}
          {[...Array(2)].map((_, j) => (
            <div
              key={j}
              className="flex flex-col md:grid md:grid-cols-12 gap-4 items-center"
            >
              <div className="col-span-6 flex items-center gap-4 w-full">
                <SkeletonImage />

                <div className="space-y-2 w-full">
                  <SkeletonText width="w-40" />
                  <SkeletonText width="w-24" height="h-3" />
                </div>
              </div>

              <div className="col-span-2 w-full md:text-center">
                <SkeletonText width="w-16" />
              </div>

              <div className="col-span-2 w-full md:text-center">
                <SkeletonText width="w-10" />
              </div>

              <div className="col-span-2 w-full md:text-right">
                <SkeletonText width="w-20" />
              </div>
            </div>
          ))}
        </div>
      ))}

      <div className="flex justify-end mt-4">
        <SkeletonButton />
      </div>
    </div>
  );
}
