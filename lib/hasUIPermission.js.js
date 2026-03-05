// lib/can.js
export function can(permissions, resource, action) {
  if (!permissions) return false;

  // SUPER_ADMIN
  if (permissions.includes("*")) return true;

  return permissions.includes(`${resource}:${action}`);
}

// useages 
// import { useSession } from "next-auth/react";
//   const { data: session } = useSession();
//   const permissions = session?.user?.permissions;

//        {can(permissions, "order", "delete") && (
//        <>
       
//        </>
//       )}