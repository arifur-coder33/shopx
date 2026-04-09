import { Skeleton } from "./Skeleton";

export function SkeletonCircle({ size = "w-10 h-10" }) {
  return <Skeleton className={`${size} rounded-full`} />;
}
