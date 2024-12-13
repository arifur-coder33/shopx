"use client";

import { useSession } from "next-auth/react";

export default function UserName({ className }) {
  const { data: session } = useSession();

  if (session) {
    return <div className={className}>{session?.user?.name}</div>;
  } else {
    return null;
  }
}
