// src/components/NavBar.js (REVISED)

import { getNotice } from "@/backend/serverActions/noticeaction";
import { getSiteSetting } from "@/backend/serverActions/siteSettingAction";
import Logo from "@/components/common/Logo";
import Link from "next/link";
import NavActions from "./common/NavActions";
import Notice from "./common/Notice";

export default async function NavBar() {
  // Fetch all data in parallel!
  const [noticeResult, siteSettingResult] = await Promise.all([
    getNotice(),
    getSiteSetting({ select: { logo: true, name: true } }),
  ]);

  const noticeData = noticeResult.data;
  const siteSettingData = siteSettingResult.data;

  return (
    <>
      {/* Pass the fetched data down as props */}
      <Notice data={noticeData} />

      <header className="sticky top-0 z-40 text-slate-200 w-full bg-gradient-to-br from-[rgba(15,23,42,0.85)] via-[rgba(0,0,0,0.85)] to-[rgba(15,23,42,0.85)] shadow-sm shadow-slate-200">
        <div className="mx-auto flex flex-row justify-between items-center max-w-7xl">
          <div className={`md:text-5xl text-3xl font-bold text-purple`}>
            <Link href={"/"}>
              {/* Pass the fetched data down as props */}
              <Logo data={siteSettingData} />
            </Link>
          </div>
          <NavActions />
        </div>
      </header>
    </>
  );
}
