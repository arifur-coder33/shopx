import { MoonStar, ShoppingCart, User2Icon } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import ThemeToggle from "../TheamToggle"; // Corrected spelling
import WishlistNavLink from "../wishlist/WishlistNavLink";
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
  return (
    <div className="flex flex-row justify-end gap-1 items-center">
      <Link
        className="hidden md:block border-2 rounded-md  px-2 hover:bg-brand"
        href={"/tracking"}
      >
        অর্ডার ট্রাকিং
      </Link>
      <UserMenu>
        <User2Icon className="nav-hover" />
      </UserMenu>

      <Link href="/my-account" aria-label="My account" title="My account" className="grid h-10 w-10 place-items-center rounded-full text-text-muted transition hover:bg-primary-soft hover:text-primary md:hidden">
        <User2Icon className="h-5 w-5" />
      </Link>

      <WishlistNavLink className="hidden md:flex" />

      <div className="flex h-10 w-10 shrink-0 items-center justify-center md:h-12 md:w-12">
        <Cart>
          <ShoppingCart className="nav-hover" />{" "}
        </Cart>
      </div>

      <ThemeToggle className="nav-hover hidden md:block" />
    </div>
  );
}
