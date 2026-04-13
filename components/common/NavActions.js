import { auth } from "@/auth";
import { LogInIcon, MoonStar, ShoppingCart, User2Icon } from "lucide-react";
import dynamic from "next/dynamic";
import { headers } from "next/headers";
import Link from "next/link";
import ThemeToggle from "../TheamToggle"; // Corrected spelling
import UserMenu from "./UserMenu";
const Cart = dynamic(() => import("@/components/Cart"));

const NavActionsSkeleton = () => (
  <div className="flex flex-row justify-end gap-1 items-center">
    <Link className="nav-hover" href={"/login"} aria-label="Login">
      <User2Icon />
    </Link>
    <Link className="nav-hover" href={"/my-account"} aria-label="My Account">
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

export default async function NavActions() {
  const session = await auth();
  const h = headers();

  console.log("SESSION:", session);
  console.log("COOKIES:", h.get("cookie"));
  return (
    <div className="flex flex-row justify-end gap-1 items-center">
      {/* {session && (
        <div className="h-6 w-6">
          <Logout className="nav-hover" aria-label="Logout">
            <LogOutIcon />{" "}
          </Logout>
        </div>
      )}
      {!session && (
        <div className="h-6 w-6  hidden md:block ">
          <Link className="nav-hover" href={"/login"}>
            <LogInIcon />
          </Link>
        </div>
      )} */}

      <UserMenu session={session}>
        <User2Icon className="nav-hover" />
      </UserMenu>

      <div className="h-6 w-6 hidden md:block">
        <Link className="nav-hover" href={"/login"}>
          <LogInIcon />
        </Link>
      </div>

      {/* <div className="h-6 w-6  hidden md:block ">
        <Link prefetch={true} className="nav-hover" href={"/my-account"}>
          <User2Icon />
        </Link>
      </div> */}

      <div className="h-6 w-6 hidden md:block">
        <Cart>
          <ShoppingCart className="nav-hover" />{" "}
        </Cart>
      </div>

      <ThemeToggle className="nav-hover" />
    </div>
  );
}
