import { getOrderById } from "@/backend/serverActions/orderActions";
import OrderDetailsPage from "../../orders/_components/OrderDetailsPage";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Order2DetailPage({ params }) {
  const { orderId } = await params;
  const result = await getOrderById(orderId);
  if (!result?.success || !result.data) return <div className="card">{result?.error === "Unauthorized" ? "Unauthorized" : "অর্ডার পাওয়া যায়নি।"}</div>;
  return <><Link href="/admin/orders2" className="mb-4 inline-block text-sm font-semibold text-primary">← অর্ডার ২-এ ফিরুন</Link><OrderDetailsPage order={result.data} /></>;
}
