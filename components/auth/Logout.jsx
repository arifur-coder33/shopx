// "use client";
// import { useMounted } from "@/hooks/useMounted";
// import { LogOutIcon } from "lucide-react";
// import { signOut, useSession } from "next-auth/react";
// export default function Logout({ className, children }) {
//   const { data: session } = useSession();
//   console.log("Logout session:", session);
//   const hasMounted = useMounted();

//   if (!hasMounted) {
//     // If not mounted, return a placeholder or nothing.
//     return <> {children}</>;
//   }
//   if (hasMounted && session) {
//     return (
//       <button className={className} onClick={() => signOut()}>
//         <LogOutIcon />
//       </button>
//     );
//   } else {
//     return null;
//   }
// }
"use client";
import { LogOutIcon } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

export default function Logout({ className }) {
  const { data: session, status } = useSession();

  if (status === "loading") return null;
  if (!session) return null;

  return (
    <button className={className} onClick={() => signOut()}>
      <LogOutIcon />
    </button>
  );
}
