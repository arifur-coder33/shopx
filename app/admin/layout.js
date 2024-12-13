import AdminNavBar from "@/components/nav/AdminNav";
import { SessionProvider } from "next-auth/react";
import Link from "next/link";
import { Suspense } from "react";
export const metadata = {
  title: "Admin | আমার শপ",
  description: "ঘরে বসে পন্য অর্ডার করুন",
};

export default function AdminLayout({ children }) {
  return (
    <>
      <SessionProvider>
        <AdminNavBar />
        <div className="max-w-7xl mx-auto p-2">
          <div className="flex flex-row">
            <div className="md:w-64 w-36 hidden md:block relative shrink">
              <div className="md:w-64 w-36 flex flex-col min-h-screen bg-slate-950 absolute top-0 left-0 ">
                <div className="bg-slate-800 p-2 text-slate-200 border-b-2 border-slate-700 ">
                  <Link href={"/admin/product/add"}>Add Product</Link>
                </div>
                <div className="bg-slate-800 p-2 text-slate-200 border-b-2 border-slate-700 ">
                  <Link href={"/admin/product"}>Product List</Link>
                </div>
                <div className="bg-slate-800 p-2 text-slate-200 border-b-2 border-slate-700 ">
                  <Link href={"/admin/category/add"}>Add Category</Link>
                </div>
                <div className="bg-slate-800 p-2 text-slate-200 border-b-2 border-slate-700 ">
                  <Link href={"/admin/order"}>Order</Link>
                </div>
              </div>
            </div>
            <div className="flex-1 shrink overflow-scroll bg-slate-300 min-h-screen">
              <Suspense fallback="loading...........">{children}</Suspense>
            </div>
          </div>
        </div>
      </SessionProvider>
    </>
  );
}
