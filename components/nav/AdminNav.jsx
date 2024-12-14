// import { KalpanaUNICODE } from "@/app/layout";

import { AlignJustify, User2Icon } from "lucide-react";
import Link from "next/link";

import Logout from "@/components/auth/Logout";
import KalapanaFont from "@/components/KalapanaFont";
import ThemeToggle from "@/components/TheamToggle";
import UserName from "@/components/auth/UserName";
export default async function AdminNavBar() {
  return (
    <>
      <div className=" sticky top-0 z-40 text-slate-200 hover:text-slate-100  w-full bg-gradient-to-br from-[rgba(15,23,42,0.85)] via-[rgba(0,0,0,0.85)] to-[rgba(15,23,42,0.85)] shadow-sm shadow-slate-200 p-2">
        <div className="mx-auto flex flex-row justify-between items-center max-w-7xl">
          <div className="flex flex-row gap-2 items-center">
            <div className="">
              <AlignJustify />{" "}
            </div>
            <div className={` md:text-5xl text-3xl font-bold  text-purple`}>
              <Link href={"/"}>
                {" "}
                <KalapanaFont>আমার শপ</KalapanaFont>{" "}
              </Link>
            </div>
          </div>
          <div className="md:flex flex-row justify-end gap-1 items-center hidden ">
            <UserName />
            <Link className="nav-hover" href={"/login"}>
              <User2Icon />
            </Link>

            <Logout className="nav-hover" />

            <ThemeToggle className="nav-hover" href={"/login"} />
          </div>
        </div>
      </div>
    </>
  );
}
