"use client";
import { useMounted } from "@/hooks/useMounted";
import { LogOutIcon } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
export default function Logout({ className, children }) {
  const { data: session } = useSession();
  const hasMounted = useMounted();
  if (!hasMounted) {
    // If not mounted, return a placeholder or nothing.
    return <> {children}</>;
  }
  if (hasMounted && session) {
    return (
      <button className={className} onClick={() => signOut()}>
        <LogOutIcon />
      </button>
    );
  } else {
    return null;
  }
}
