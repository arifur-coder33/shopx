import MessengerOrderForm from "./MessengerOrderForm";

export const dynamic = "force-dynamic";

export default async function MessengerOrderPage({ searchParams }) {
  const params = await searchParams;
  return <MessengerOrderForm token={String(params?.t || "")} />;
}
