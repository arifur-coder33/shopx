import OrderCountsSkeleton from "@/components/skeletons/OrderCountSkeleton";
import { Suspense } from "react";
import OrderCounts from "./_components/OrderCounts";

export default function AccountLayout({ children }) {
  return (
    <div>
      <Suspense fallback={<OrderCountsSkeleton />}>
        <OrderCounts />
      </Suspense>

      <main className="flex-1 p-3 md:p-6">{children}</main>
    </div>
  );
}
