import { Skeleton } from "./Skeleton";

export function SkeletonImage({ size = "w-16 h-16" }) {
  return <Skeleton className={`${size} rounded-lg`} />;
}
