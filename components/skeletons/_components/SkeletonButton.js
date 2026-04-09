import { Skeleton } from "./Skeleton";

export function SkeletonButton({ width = "w-24", height = "h-10" }) {
  return <Skeleton className={`${width} ${height} rounded-md`} />;
}
