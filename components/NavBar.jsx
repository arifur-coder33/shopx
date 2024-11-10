// import { KalpanaUNICODE } from "@/app/layout";
import Link from "next/link";
import Cart from "./Cart";
import KalapanaFont from "./KalapanaFont";
import ThemeToggle from "./TheamToggle";
export default function NavBar() {
  return (
    <>
      <div className=" sticky top-0 z-40 text-slate-200 hover:text-slate-100  w-full bg-gradient-to-br from-slate-900 via-black to-slate-900 opacity-75 shadow-sm shadow-slate-200 p-2">
        <div className="mx-auto flex flex-row justify-between items-center max-w-7xl">
          <div className={` md:text-5xl text-3xl font-bold  text-purple`}>
            <Link href={"/"}>
              {" "}
              <KalapanaFont>আমার শপ</KalapanaFont>{" "}
            </Link>
          </div>
          <div className="flex flex-row justify-end items-center">
            <ThemeToggle />
            <Cart />
          </div>
        </div>
      </div>
    </>
  );
}
