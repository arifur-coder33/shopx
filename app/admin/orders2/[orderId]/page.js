import { auth } from "@/auth";
import { hasUIPermission } from "@/lib/hasUIPermission.js";
import { getOrderById, markOrderViewedAction } from "@/backend/serverActions/orderActions";
import OrderDetailsPage from "../../orders/_components/OrderDetailsPage";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Order2DetailPage({ params }) {
  const session = await auth();
  if (!hasUIPermission(session?.user?.permissions, "order", "view")) return <div className="card">Unauthorized</div>;
  const { orderId } = await params;
  await markOrderViewedAction(orderId);
  const result = await getOrderById(orderId);
  if (!result?.success || !result.data) return <div className="card">অর্ডার পাওয়া যায়নি।</div>;
  return <><Link href="/admin/orders2" className="mb-4 inline-block text-sm font-semibold text-primary">← অর্ডার ২-এ ফিরুন</Link><OrderDetailsPage order={result.data} /></>;
}
