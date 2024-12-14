import { getOrderByOrderNo } from "@/backend/serverActions/orderActions";

export default async function OrderDetailsPage({ params }) {
  const { orderNo } = await params;
  const orderData = await getOrderByOrderNo(orderNo);
  console.log(orderData);
  if (orderData.data.length === 0) {
    return "No order found";
  }
  if (!orderData?.success) {
    return "Something Went wron";
  }
  return <h1>Order Page {orderNo}</h1>;
}
