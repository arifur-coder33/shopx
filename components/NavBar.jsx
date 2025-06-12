// src/components/NavBar.js (Now a cleaner Server Component)

import Logo from "@/components/common/Logo";
import Link from "next/link";
import NavActions from "./common/NavActions"; // Import the new client component
import Notice from "./common/Notice";

export default async function NavBar() {
  // This component remains a Server Component.
  // It can still fetch data, e.g., from a CMS for the notice.

  return (
    <>
      <Notice />
      <header className="sticky top-0 z-40 text-slate-200 w-full bg-gradient-to-br from-[rgba(15,23,42,0.85)] via-[rgba(0,0,0,0.85)] to-[rgba(15,23,42,0.85)] shadow-sm shadow-slate-200">
        <div className="mx-auto flex flex-row justify-between items-center max-w-7xl">
          <div className={`md:text-5xl text-3xl font-bold text-purple`}>
            <Link href={"/"}>
              <Logo />
            </Link>
          </div>

          {/* All interactive elements are now neatly contained in this one component */}
          <NavActions />
        </div>
      </header>
    </>
  );
}
