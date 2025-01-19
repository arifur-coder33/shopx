import { getOrderByOrderNo } from "@/backend/serverActions/orderActions";
import OrderDeliveryDetails from "@/components/tracking/OrderDeliveryDetails";
import OrderItemTable from "@/components/tracking/OrderItemTable";
export default async function OrderDetailsPage({ params, searchParams }) {
  const { orderNo } = await params;
  const { p, orderSuccess } = await searchParams;
  const { success, data, error } = await getOrderByOrderNo(orderNo, p);
  if ((!success && error) || !data) {
    return <p>কোন ডাটা পাওয়া যায়নি।</p>;
  }
  return (
    <div className="grid sm:grid-cols-2 px-4 border mt-2 rounded-2xl">
      <OrderDeliveryDetails data={data} />
      <div className="mx-2 my-2  col-span-full  ">
        Status:{" "}
        <span className="bg-orange-500 p-2 rounded-2xl">{data?.status}</span>
      </div>
      <OrderItemTable data={data} />
    </div>
  );
}
