// export const dynamic = "force-static";

import { getAllOrder } from "@/backend/serverActions/orderActions";
import OrderListTable from "@/components/orders/OrderLIst";

export default async function ProductListPage() {
  const { success, data, error } = await getAllOrder();

  if (!success) {
    return "Some thing went wrong";
  }

  if (success && data.length === 0) {
    return "No order received Yet.";
  }

  return <OrderListTable data={data} />;
}
