export const dynamic = "force-static";

import { getAllOrders } from "@/backend/serverActions/orderActions";
import OrderListTable from "@/components/orders/OrderLIst";

export default async function ProductListPage() {
  const data = await getAllOrders();

  if (!data.success) {
    return "Some thing went wrong"
  }

  if (data.success && data?.data.length===0) {
    return "No order received Yet."
  }


  return <OrderListTable data={data?.data} />;
}
