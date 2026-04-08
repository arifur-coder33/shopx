import OrderItemsTable from "@/app/admin/orders/_components/components/OrderItemsTable";
import { auth } from "@/auth";
import { fetchCursorData } from "@/backend/serverActions/fetchDataActon";
import Link from "next/link";

const statusMap = {
  all: null,
  running: [
    "PENDING",
    "PROCESSING",
    "READY_TO_SHIP",
    "SHIPPED",
    "DELIVERY_FAILED",
  ],
  cancelled: ["CANCELLED", "FAILED_RETURNING", "FAILED_RETURN_RECEIVED"],
  delivered: ["DELIVERED", "RETURNING", "RETURNED"],
  refunded: ["REFUNDING", "REFUNDED"],
};

export default async function UserOrderPage({ params }) {
  const statusKey = params.params?.[0] || "all";
  const cursor = params.params?.[1] || null;

  const session = await auth();
  const userId = session?.user?.id;

  const statusFilter = statusMap[statusKey];

  const fatchData = await fetchCursorData({
    model: "order",
    where: { userId, ...(statusFilter && { status: { in: statusFilter } }) },
    take: 5,
    cursor,
    select: {
      id: true,
      status: true,
      orderNo: true,
      orderItems: {
        select: {
          id: true,
          productName: true,
          quantity: true,
          price: true,
          thumbnail: true,
          combinations: true,
        },
      },
      createdAt: true,
    },
  });

  const orders = fatchData?.data || [];

  const nextCursor = fatchData?.pagination?.nextCursor || null;

  return (
    <div className="space-y-4 flex flex-col">
      {orders.map((order) => (
        <Link
          key={order.id}
          prefetch={true}
          href={`/my-account/orders/view/${order.id}`}
        >
          <div className="transition-all duration-200 md:hover:scale-[1.02] md:hover:shadow-md">
            <OrderItemsTable
              orderNo={order.orderNo}
              date={order.createdAt}
              status={order.status}
              items={order.orderItems}
              style="user"
            />
          </div>
        </Link>
      ))}

      <div className="flex justify-end mt-4">
        {nextCursor && (
          <Link
            href={`/my-account/orders/${statusKey}/${nextCursor}`}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Next
          </Link>
        )}
      </div>
    </div>
  );
}
// export const revalidate = 30;

// import OrderItemsTable from "@/app/admin/orders/_components/components/OrderItemsTable";
// import { auth } from "@/auth";
// import { fetchCursorData } from "@/backend/serverActions/fetchDataActon";
// import Link from "next/link";
// import { cache } from "react";

// const statusMap = {
//   all: null,
//   running: [
//     "PENDING",
//     "PROCESSING",
//     "READY_TO_SHIP",
//     "SHIPPED",
//     "DELIVERY_FAILED",
//   ],
//   cancelled: ["CANCELLED", "FAILED_RETURNING", "FAILED_RETURN_RECEIVED"],
//   delivered: ["DELIVERED", "RETURNING", "RETURNED"],
//   refunded: ["REFUNDING", "REFUNDED"],
// };

// // ✅ cache wrapper
// export const getOrdersCached = cache(async (params) => {
//   return await fetchCursorData(params);
// });

// export default async function UserOrderPage({ params }) {
//   const statusKey = params.params?.[0] || "all";
//   const cursor = params.params?.[1] || null;

//   const statusFilter = statusMap[statusKey];

//   // ✅ Promise + parallel execution
//   const sessionPromise = auth();

//   const dataPromise = sessionPromise.then((session) => {
//     const userId = session?.user?.id;

//     return getOrdersCached({
//       model: "order",
//       where: {
//         userId,
//         ...(statusFilter && { status: { in: statusFilter } }),
//       },
//       take: 5, // ✅ better UX (was 1 ❌)
//       cursor,
//       select: {
//         id: true,
//         status: true,
//         orderNo: true,
//         orderItems: {
//           select: {
//             id: true,
//             productName: true,
//             quantity: true,
//             price: true,
//             thumbnail: true,
//           },
//         },
//         createdAt: true,
//       },
//     });
//   });

//   // ✅ parallel await
//   const [session, fatchData] = await Promise.all([sessionPromise, dataPromise]);

//   const orders = fatchData?.data || [];
//   const nextCursor = fatchData?.pagination?.nextCursor || null;

//   return (
//     <div className="space-y-4 flex flex-col">
//       {orders.map((order) => (
//         <Link
//           key={order.id}
//           href={`/my-account/orders/view/${order.id}`}
//           prefetch={true} // ✅ prefetch enabled
//         >
//           <div className="cursor-pointer transition-all duration-200 md:hover:-translate-y-1 md:hover:scale-[1.02] md:hover:shadow-lg">
//             <OrderItemsTable
//               orderNo={order.orderNo}
//               date={order.createdAt}
//               status={order.status}
//               items={order.orderItems}
//               style="user"
//             />
//           </div>
//         </Link>
//       ))}

//       <div className="flex justify-end mt-4">
//         {nextCursor && (
//           <Link
//             href={`/my-account/orders/${statusKey}/${nextCursor}`}
//             className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
//           >
//             Next
//           </Link>
//         )}
//       </div>
//     </div>
//   );
// }
