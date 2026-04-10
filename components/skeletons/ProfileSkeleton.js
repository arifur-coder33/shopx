// app/profile/loading.js (Next.js auto loading)
import {
  SkeletonButton,
  SkeletonCircle,
  SkeletonText,
} from "@/components/skeletons/_components/Index";

export default function ProfileSkeleton() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Title */}
      <SkeletonText width="w-40" height="h-8" />

      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center space-y-3">
          <SkeletonCircle size="w-24 h-24" />
          <SkeletonText width="w-32" />
        </div>

        {/* Fields */}
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex justify-between items-center bg-gray-50 p-4 rounded-lg"
            >
              <div className="space-y-2">
                <SkeletonText width="w-20" height="h-3" />
                <SkeletonText width="w-40" />
              </div>
            </div>
          ))}
        </div>

        {/* Update Button */}
        <div className="flex justify-center">
          <SkeletonButton width="w-40" />
        </div>

        {/* Change Password */}
        <div className="flex justify-center">
          <SkeletonButton width="w-40" />
        </div>
      </div>
    </div>
  );
}
