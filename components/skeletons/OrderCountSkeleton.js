export default function OrderCountsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-4">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="
            border rounded-lg md:rounded-xl animate-pulse
            
            /* Mobile */
            px-3 py-2
            
            /* Desktop */
            md:p-4
          "
        >
          <div className="h-3 md:h-4 w-16 bg-gray-200 rounded mx-auto mb-1 md:mb-2"></div>
          <div className="h-4 md:h-6 w-10 bg-gray-200 rounded mx-auto"></div>
        </div>
      ))}
    </div>
  );
}
