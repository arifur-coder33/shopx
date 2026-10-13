import { auth } from "@/auth";
import { hasUIPermission } from "@/lib/hasUIPermission.js";
import { redirect } from "next/navigation";
import BarcodePrintPage from "./BarcodePrintPage";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/admin/procurement/barcode-print");
  if (!hasUIPermission(session.user.permissions || [], "inventory", "view")) {
    return <main className="card m-3">You do not have permission to print inventory barcodes.</main>;
  }
  return <BarcodePrintPage />;
}
