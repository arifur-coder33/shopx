
import AdminNavBar from "@/components/nav/AdminNav";
import NavItem from "@/components/nav/NavItem";
import { SessionProvider } from "next-auth/react";

import { Suspense } from "react";
import { notFound } from 'next/navigation'

export const metadata = {
  title: "Admin | আমার শপ",
  description: "ঘরে বসে পন্য অর্ডার করুন",
};

export default function AdminLayout({ children }) {
  const adminNavbarList=[
    {
      name:"Dashboard",
      slug:'/'
    },
    {
      name:"Order List",
      slug:'order'
    },
    {
      name:"Product List",
      slug:'product'
    },
    {
      name:"Add Product",
      slug:'product/add'
    },
    {
      name:"Category List",
      slug:'category'
    },
    {
      name:"Add Category",
      slug:'category/add'
    },
    {
      name:"User List",
      slug:'user'
    },
    {
      name:"Site Setting",
      slug:'setting'
    },
    {
      name:"Banner",
      slug:'banner'
    },
    {
      name:"Notice",
      slug:'notice'
    },
    {
      name:"Site Seo",
      slug:'seo'
    },
  ]
  const isNotFound = !children;
  return (
    <>
      <SessionProvider>
        <AdminNavBar />
        <div className="max-w-7xl mx-auto p-2">
          <div className="flex flex-row relative">
          {/* side bar  */}
            <div className="sm:w-64 w-36 hidden sm:block absolute top-0 left-0 shrink">
              <div className="sm:w-64 w-36 flex flex-col min-h-screen bg-slate-950 absolute top-0 left-0 ">
              {adminNavbarList.length>0 && adminNavbarList?.map((list)=><NavItem key={list?.slug} item={list} />)}
               
              </div>
            </div>
            {/* main content */}
            <div className="flex-1 shrink overflow-y overflow-x-auto sm:ml-64 bg-slate-300 min-h-screen">
              <Suspense fallback="loading...........">
              {isNotFound ? notFound() : children}
              </Suspense>
            </div>
          </div>
        </div>
        
      </SessionProvider>
    </>
  );
}

