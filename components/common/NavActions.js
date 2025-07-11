// import { User2Icon } from "lucide-react";
// import dynamic from "next/dynamic";
// import Link from "next/link";

// // --- THE FIX: A PERFECTED LOADING STATE ---
// // Give the placeholder the same styling as the icons it's replacing.
// // The `animate-pulse` class gives it a subtle "loading" shimmer.
// const IconPlaceholder = () => (
//   <div className="nav-hover flex items-center justify-center h-6 w-6 rounded-md bg-slate-300 dark:bg-slate-700 animate-pulse" />
// );

// const DynamicCart = dynamic(() => import("../Cart"));

// const DynamicLogout = dynamic(() => import("@/components/auth/Logout"));

// const DynamicThemeToggle = dynamic(() => import("../TheamToggle"));

// export default function NavActions() {
//   return (
//     <div className="flex flex-row justify-end gap-1 items-center">
//       {/* This link is static, so it's fine */}
//       <Link className="nav-hover" href={"/login"}>
//         <User2Icon />
//       </Link>

//       {/* These will now load in seamlessly */}
//       <DynamicLogout />
//       <DynamicCart className="nav-hover" />
//       <DynamicThemeToggle className="nav-hover" />
//     </div>
//   );
// }

// import Logout from "@/components/auth/Logout";
// import { useMounted } from "@/hooks/useMounted";
import { LogOutIcon, MoonStar, ShoppingCart, User2Icon } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";

import ThemeToggle from "../TheamToggle"; // Corrected spelling
const Logout = dynamic(() => import("@/components/auth/Logout"));
const Cart = dynamic(() => import("@/components/Cart"));
// This is a SKELETON. It's what the server will render.
// It has the final icons but no client-side logic. This prevents layout shift.
// It looks identical to the "logged out" state of the final component.
const NavActionsSkeleton = () => (
  <div className="flex flex-row justify-end gap-1 items-center">
    <Link className="nav-hover" href={"/login"} aria-label="Login">
      <User2Icon />
    </Link>
    <div className="nav-hover" aria-label="Logout placeholder">
      {/* Empty space for Logout Icon */}
      <div style={{ width: "24px", height: "24px" }} />
    </div>
    <div className="nav-hover relative" aria-label="Cart">
      <ShoppingCart />
    </div>
    <div className="nav-hover" aria-label="Theme toggle placeholder">
      <MoonStar />
    </div>
  </div>
);

export default function NavActions() {
  // This will be `false` on the server and `true` on the client after hydration.
  // const hasMounted = useMounted();

  // // If we are on the server OR during the initial client paint, show the static skeleton.
  // // This guarantees no server-client mismatch and no layout shift.
  // if (!hasMounted) {
  //   return <NavActionsSkeleton />;
  // }

  // Once mounted, render the REAL components that use client-side hooks.
  return (
    <div className="flex flex-row justify-end gap-1 items-center">
      <div className="h-6 w-6">
        <Logout className="nav-hover" aria-label="Logout">
          <LogOutIcon />{" "}
        </Logout>
      </div>
      <div className="h-6 w-6 ">
        <Link className="nav-hover" href={"/login"}>
          <User2Icon />
        </Link>
      </div>

      <div className="h-6 w-6 ">
        <Cart>
          <ShoppingCart className="nav-hover" />{" "}
        </Cart>
      </div>

      <ThemeToggle className="nav-hover" />
    </div>
  );
}
