import { auth } from "@/auth";
import { getOrderCountsbyUserId } from "@/backend/serverActions/orderActions";

export default async function AccountDashboard() {
  const session = await auth();
  const userId = session?.user?.id;

  const counts = await getOrderCountsbyUserId(userId);

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {[
        { title: "All Orders", value: counts.all },
        { title: "Running", value: counts.running },
        { title: "Delivered", value: counts.delivered },
        { title: "Cancelled", value: counts.cancelled },
        { title: "Refunded", value: counts.refunded },
      ].map((item) => (
        <div key={item.title} className="product-card p-4 text-center">
          <p className="text-lg">{item.title}</p>
          <p className="text-2xl font-bold text-purple">{item.value}</p>
        </div>
      ))}
      <p className="col-span-5 mt-4 text-sm text-slate-500 dark:text-slate-300">
        User ID: {userId}
      </p>
    </div>
  );
}
