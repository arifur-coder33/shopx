import { SkeletonText } from "@/components/skeletons/_components/Index";

export default function OrderCountsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-4">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="border rounded-lg md:rounded-xl px-3 py-2 md:p-4 space-y-2"
        >
          <SkeletonText width="w-16" height="h-3 md:h-4" />
          <SkeletonText width="w-10" height="h-4 md:h-6" />
        </div>
      ))}
    </div>
  );
}
