import { auth } from "@/auth";
import { getOrderCountsbyUserId } from "@/backend/serverActions/orderActions";
import Link from "next/link";

export default async function AccountLayout({ children }) {
  const session = await auth();
  const userId = session?.user?.id;

  const counts = await getOrderCountsbyUserId(userId);

  const items = [
    {
      title: "All Orders",
      value: counts.all,
      href: "/my-account/orders/all/1",
    },
    {
      title: "Running",
      value: counts.running,
      href: "/my-account/orders/running/1",
    },
    {
      title: "Delivered",
      value: counts.delivered,
      href: "/my-account/orders/delivered/1",
    },
    {
      title: "Cancelled",
      value: counts.cancelled,
      href: "/my-account/orders/cancelled/1",
    },
    {
      title: "Refunded",
      value: counts.refunded,
      href: "/my-account/orders/refunded/1  ",
    },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {items.map((item) => (
          <Link key={item.title} href={item.href}>
            <div className="product-card p-4 text-center cursor-pointer hover:shadow-lg transition">
              <p className="text-lg">{item.title}</p>
              <p className="text-2xl font-bold text-purple">{item.value}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Content */}
      <main className="flex-1 p-3 md:p-6">{children}</main>
    </div>
  );
}
