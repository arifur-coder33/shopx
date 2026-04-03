import OrderItemsTable from "@/app/admin/orders/_components/components/OrderItemsTable";
import { auth } from "@/auth";
import { getOrders } from "@/backend/serverActions/orderActions";
import Pagination from "@/components/common/Pagination";

import Link from "next/link";

export default async function UserOrderPage({ params }) {
  const status = params.params?.[0] || "all";
  const page = Number(params.params?.[1]) || 1;
  const session = await auth();
  const userId = session?.user?.id;
  console.log(" Status in page component:", status);
  const fatchData = await getOrders({
    userId,
    page,
    limit: 5,
    ...(status !== "all" && { status }),
  });
  const orders = fatchData?.data || [];
  const pagination = fatchData?.pagination;
  console.log(fatchData, "pagination in page component");
  return (
    <div className="space-y-4 gap-2 flex flex-col">
      {orders.map((order) => (
        <Link href={`/my-account/orders/view/${order.id}`} key={order.id}>
          <div>
            <OrderItemsTable
              status={order.status}
              items={order.orderItems}
              style={"user"}
            />
          </div>
        </Link>
      ))}
      <Pagination pagination={pagination} basePath="/my-account/orders/" />
    </div>
  );
}
