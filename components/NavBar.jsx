// import { KalpanaUNICODE } from "@/app/layout";
import { User2Icon } from "lucide-react";
import Link from "next/link";
import Cart from "./Cart";
import KalapanaFont from "./KalapanaFont";
import ThemeToggle from "./TheamToggle";
export default function NavBar() {
  return (
    <>
      <div className=" sticky top-0 z-40 text-slate-200 hover:text-slate-100  w-full bg-gradient-to-br from-[rgba(15,23,42,0.85)] via-[rgba(0,0,0,0.85)] to-[rgba(15,23,42,0.85)] shadow-sm shadow-slate-200 p-2">
        <div className="mx-auto flex flex-row justify-between items-center max-w-7xl">
          <div className={` md:text-5xl text-3xl font-bold  text-purple`}>
            <Link href={"/"}>
              {" "}
              <KalapanaFont>আমার শপ</KalapanaFont>{" "}
            </Link>
          </div>
          <div className="flex flex-row justify-end gap-1 items-center">
            <Link className="nav-hover" href={"/login"}>
              <User2Icon />
            </Link>
            <Cart className="nav-hover" href={"/login"} />
            <ThemeToggle className="nav-hover" href={"/login"} />
          </div>
        </div>
      </div>
    </>
  );
}
