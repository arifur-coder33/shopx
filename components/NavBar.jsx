// import { KalpanaUNICODE } from "@/app/layout";
import { auth } from "@/auth";
import { User2Icon } from "lucide-react";
import Link from "next/link";
import Cart from "./Cart";
import KalapanaFont from "./KalapanaFont";
import Logout from "./Logout";
import ThemeToggle from "./TheamToggle";
export default async function NavBar({ hideCart }) {
  const session = await auth();
  let BAG = null;
  if (!hideCart) BAG = <Cart className="nav-hover" />;
  if (!hideCart && session?.user?.role === "ADMIN") BAG = null;
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
            {session && <div>{session?.user?.name}</div>}
            <Link className="nav-hover" href={"/login"}>
              <User2Icon />
            </Link>
            <Logout />
            {BAG}

            <ThemeToggle className="nav-hover" href={"/login"} />
          </div>
        </div>
      </div>
    </>
  );
}
