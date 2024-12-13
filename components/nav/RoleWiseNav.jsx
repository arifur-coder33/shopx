"use client";
import Cart from "@/components/Cart";
import { useSession } from "next-auth/react";

export default function RoleWiseNav() {
  const { data: session } = useSession();
  if (!session?.user?.role === "ADMIN") <Cart className="nav-hover" />;

  return;
}
