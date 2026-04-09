import { Skeleton } from "./Skeleton";

export function SkeletonText({ width = "w-full", height = "h-4" }) {
  return <Skeleton className={`${width} ${height} rounded`} />;
}
