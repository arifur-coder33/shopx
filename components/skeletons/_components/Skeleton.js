export function Skeleton({ className = "" }) {
  return (
    <div
      className={`bg-gray-300 dark:bg-slate-500 animate-pulse ${className}`}
    />
  );
}
