import { auth } from "@/auth";
import { getOrderCountsbyUserId } from "@/backend/serverActions/orderActions";
import Link from "next/link";

export default async function OrderCounts() {
  const session = await auth();
  const userId = session?.user?.id;

  const counts = await getOrderCountsbyUserId(userId);

  const items = [
    { title: "All Orders", value: counts.all, href: "/my-account/orders/all" },
    {
      title: "Running",
      value: counts.running,
      href: "/my-account/orders/running",
    },
    {
      title: "Delivered",
      value: counts.delivered,
      href: "/my-account/orders/delivered",
    },
    {
      title: "Cancelled",
      value: counts.cancelled,
      href: "/my-account/orders/cancelled",
    },
    {
      title: "Refunded",
      value: counts.refunded,
      href: "/my-account/orders/refunded",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-4">
      {items.map((item) => (
        <Link key={item.title} href={item.href}>
          <div
            className="
              border rounded-lg md:rounded-xl transition
              
              /* Mobile (compact) */
              px-3 py-2 text-center bg-white border-gray-100
              
              /* Desktop (big card) */
              md:p-4 md:bg-white md:shadow-sm md:hover:shadow-md
              
              active:scale-[0.97]
            "
          >
            {/* Title */}
            <p className="text-xs md:text-base text-gray-500 md:text-gray-700 leading-tight">
              {item.title}
            </p>

            {/* Value */}
            <p className="text-lg md:text-2xl font-bold text-purple leading-tight mt-1">
              {item.value ?? 0}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
