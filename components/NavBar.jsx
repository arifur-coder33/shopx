// src/components/NavBar.js (REVISED)

import { getCategoryTree } from "@/backend/serverActions/catagoryActions";
import { getNotice } from "@/backend/serverActions/noticeaction";
import { getSiteSetting } from "@/backend/serverActions/siteSettingAction";
import Logo from "@/components/common/Logo";
import SearchBoxWrapper from "@/components/Search/SearchBoxWrapper";
import Link from "next/link";
import CategoryDrawer from "./common/Category/CategoryDrawer";
import NavActions from "./common/NavActions";
import Notice from "./common/Notice";
export default async function NavBar() {
  // Fetch all data in parallel!
  const [noticeResult, siteSettingResult, categoryResult] = await Promise.allSettled([
    getNotice(),
    getSiteSetting(),
    getCategoryTree(),
  ]);

  const noticeData = noticeResult.status === "fulfilled" ? noticeResult.value?.data : null;
  const siteSettingData = siteSettingResult.status === "fulfilled" ? siteSettingResult.value?.data : null;
  const categoryData = categoryResult.status === "fulfilled" ? categoryResult.value : [];

  return (
    <>
      {/* Pass the fetched data down as props */}
      <Notice data={noticeData} />

      <header className="sticky top-0 z-30 w-full border-b border-border bg-surface/95 text-text shadow-sm backdrop-blur supports-[backdrop-filter]:bg-surface/85">
        <div className="site-container flex min-h-16 items-center gap-2 py-2 sm:gap-4">
          <div
            className="flex shrink-0 items-center gap-1 text-2xl font-bold text-brand md:text-4xl"
          >
            <div className="hidden md:block">
              <CategoryDrawer initialData={categoryData}></CategoryDrawer>
            </div>

            <Link href={"/"}>
              {/* Pass the fetched data down as props */}
              <Logo data={siteSettingData} />
            </Link>
          </div>
          <div className="min-w-0 flex-1"><SearchBoxWrapper /></div>
          <div className="shrink-0"><NavActions /></div>
        </div>
      </header>
    </>
  );
}
