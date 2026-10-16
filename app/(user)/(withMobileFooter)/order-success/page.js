import Link from "next/link";
import { getOrderSuccessPageData } from "@/backend/serverActions/orderActions";
import OrderSuccessExperience from "./OrderSuccessExperience";

export default async function OrderSuccessPage({ searchParams }) {
  const { p, o } = await searchParams;
  const result = await getOrderSuccessPageData({ orderNo: o, phoneNumber: p });
  if (!result.success) return <main className="mx-auto max-w-xl p-8 text-center"><h1 className="text-2xl font-bold">অর্ডার পাওয়া যায়নি</h1><Link className="button mt-5" href="/">হোমে ফিরুন</Link></main>;
  return <OrderSuccessExperience order={result.order} phoneNumber={p} reconfirm={result.reconfirm} products={result.products} />;
}
