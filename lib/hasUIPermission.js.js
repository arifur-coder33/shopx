// lib/can.js
export function hasUIPermission(permissions, resource, action) {
  if (!permissions) return false;

  // SUPER_ADMIN
  if (permissions.includes("*")) return true;

  return permissions.includes(`${resource}:${action}`);
}

// useages
// import { hasUIPermission } from "@/lib/hasUIPermission.js";
// import { auth } from "@/auth";
//   const session = await auth();

//   if (!hasUIPermission(session.user.permissions, "order", "view")) {
//     return <div>Unauthorized</div>;
//   }
