// src/components/NavActions.js
"use client"; // This is the most important line!

import Link from "next/link";
import { User2Icon } from "lucide-react";
import Logout from "@/components/auth/Logout";
import Cart from "../Cart";
import ThemeToggle from "../TheamToggle";

export default function NavActions() {
  // Any client-side logic (like using useSession to decide which icon to show)
  // would go here. For now, we'll just render the components.

  return (
    <div className="flex flex-row justify-end gap-1 items-center">
      {/* 
        This is a great place to use the useSession() hook to conditionally
        render Login vs Logout/Profile info. For now, we keep your original structure.
      */}
      <Link className="nav-hover" href={"/login"}>
        <User2Icon />
      </Link>
      
      {/* Logout component likely uses useSession and is already a client component */}
      <Logout />
      
      {/* Cart component needs client-side context to get item count */}
      <Cart className="nav-hover" />
      
      {/* ThemeToggle needs client-side state to handle theme changes */}
      <ThemeToggle className="nav-hover" />
    </div>
  );
}