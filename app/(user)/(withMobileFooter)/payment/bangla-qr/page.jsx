import BanglaQrPaymentPageClient from "@/components/payments/BanglaQrPaymentPageClient";
import { getOrderByOrderNo } from "@/backend/serverActions/orderActions";
import Link from "next/link";

export default async function BanglaQrPaymentPage({ searchParams }) {
  const { o, p } = await searchParams;
  const result = await getOrderByOrderNo({ orderNo: o, phoneNumber: p });
  const order = result?.success ? result.data : null;
  const qrPayment = order?.payments?.find((payment) => payment.paymentGateway?.adapterKey === "BANGLA_QR" || payment.gateway === "BANGLA_QR");
  if (!order || order.selectedPaymentGateway?.adapterKey !== "BANGLA_QR") return <main className="mx-auto max-w-lg p-8 text-center"><p>এই Bangla QR পেমেন্টটি পাওয়া যায়নি।</p><Link href="/tracking" className="mt-4 inline-block text-primary underline">অর্ডার ট্র্যাক করুন</Link></main>;
  return <BanglaQrPaymentPageClient order={{ ...order, qrPayment }} />;
}
