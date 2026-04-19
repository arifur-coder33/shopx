import { auth } from "@/auth";
import { getOrderCountsbyUserId } from "@/backend/serverActions/orderActions";
import NavItem2 from "@/components/nav/NavItem2";

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
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-4 ">
        {items.map((item) => (
          <NavItem2 mobile key={item.href} href={item.href}>
            <span>{item.title}</span>
            <p className="text-lg md:text-2xl font-bold text-purple leading-tight mt-1">
              {item.value ?? 0}
            </p>
          </NavItem2>
        ))}
      </div>
    </>
  );
}
