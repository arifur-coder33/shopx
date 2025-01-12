
import Link from "next/link";
import Logo from "@/components/common/Logo";


export default async function Footer() {
  return (
    <>
      <div className=" sticky top-0 z-40 text-slate-200 hover:text-slate-100  w-full bg-gradient-to-br from-[rgba(15,23,42,0.85)] via-[rgba(0,0,0,0.85)] to-[rgba(15,23,42,0.85)] shadow-sm shadow-slate-200 p-2">
        <div className="mx-auto flex flex-row justify-between items-center max-w-7xl">
          <div className={` md:text-5xl text-3xl font-bold  text-purple`}>
            <Link href={"/"}>
              <Logo/>           
            </Link>
          </div>
          <div className="flex flex-row justify-end gap-1 items-center">
           
          </div>
        </div>
      </div>
    </>
  );
}
