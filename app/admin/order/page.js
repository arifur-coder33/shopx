export const dynamic = "force-static";
import { getAllOrders } from "@/backend/serverActions/orderActions";
import OrderListTable from "@/components/orders/OrderLIst";

export default async function ProductListPage() {
  const data = await getAllOrders();

  return <OrderListTable data={data} />;
}
