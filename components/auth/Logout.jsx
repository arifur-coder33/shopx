"use client";
import { LogOutIcon } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

export default function Logout({ className }) {
  const { data: session } = useSession();

  if (session) {
    return (
      <button className={className} onClick={() => signOut()}>
        <LogOutIcon />
      </button>
    );
  } else {
    return null;
  }
}
