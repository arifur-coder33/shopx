// import { KalpanaUNICODE } from "@/app/layout";
import Logout from "@/components/auth/Logout";
import { User2Icon } from "lucide-react";
import Link from "next/link";
import KalapanaFont from "./KalapanaFont";
import ThemeToggle from "./TheamToggle";
import Cart from "./Cart";
import Imagecustom from "./images/ImageCustom";
import Image from "next/image";
import Logo from "@/components/common/Logo";
import Notice from "./common/Notice";


export default async function NavBar() {
  return (
    <>
          <Notice/>
      <div className=" sticky top-0 z-40 text-slate-200 hover:text-slate-100  w-full bg-gradient-to-br from-[rgba(15,23,42,0.85)] via-[rgba(0,0,0,0.85)] to-[rgba(15,23,42,0.85)] shadow-sm shadow-slate-200 ">
 
        <div className="mx-auto flex flex-row justify-between items-center max-w-7xl">
          <div className={` md:text-5xl text-3xl font-bold  text-purple`}>
            <Link href={"/"}>
                {/* <Imagecustom
                   
                    className=" rounded-md "
                    placeholder="blur"
                    src={'logo.png'}
                            sizes="100px"
                    h={100}
                    w={100}
                    alt={'logo'}
                  /> */}
              <Logo/>
              {/* <KalapanaFont>বিডিশপ২৪</KalapanaFont>{" "} */}
            </Link>
          </div>
          <div className="flex flex-row justify-end gap-1 items-center">
            {/* {session && <div>{session?.user?.name}</div>} */}
            <Link className="nav-hover" href={"/login"}>
              <User2Icon />
            </Link>
            <Logout />
           <Cart className="nav-hover" />
            <ThemeToggle className="nav-hover" href={"/login"} />
          </div>
        </div>
      </div>
    </>
  );
}
