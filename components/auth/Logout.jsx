"use client";
import { LogOutIcon } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

export default function Logout({ className, children }) {
  const { data: session, status } = useSession();

  if (status === "loading") return null;
  if (!session) return null;

  return (
    <button className={className} onClick={() => signOut()}>
      <LogOutIcon /> {children}
    </button>
  );
}
