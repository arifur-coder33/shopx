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
  const [noticeResult, siteSettingResult, categoryData] = await Promise.all([
    getNotice(),
    getSiteSetting({ select: { logo: true, name: true } }),
    getCategoryTree(),
  ]);

  const noticeData = noticeResult.data;
  const siteSettingData = siteSettingResult.data;

  return (
    <>
      {/* Pass the fetched data down as props */}
      <Notice data={noticeData} />

      <header className="sticky top-0 z-30 text-slate-200 w-full bg-gradient-to-br from-[rgba(15,23,42,0.85)] via-[rgba(0,0,0,0.85)] to-[rgba(15,23,42,0.85)] shadow-sm shadow-slate-200">
        <div className="mx-auto flex flex-row justify-between gap-4 items-center max-w-7xl">
          <div
            className={`md:text-5xl text-3xl font-bold text-brand flex flex-row gap-1 items-center `}
          >
            <div className="hidden md:block">
              <CategoryDrawer initialData={categoryData}></CategoryDrawer>
            </div>

            <Link href={"/"}>
              {/* Pass the fetched data down as props */}
              <Logo data={siteSettingData} />
            </Link>
          </div>
          <SearchBoxWrapper />
          <NavActions />
        </div>
      </header>
    </>
  );
}
