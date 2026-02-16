"use client";

import { useMemo } from "react";

export function usePermission(permissionsMap) {
  const can = useMemo(() => {
    return (resource, action) => {
      return !!permissionsMap?.[resource]?.includes(action);
    };
  }, [permissionsMap]);

  return { can };
}

/// page example-----------------------------------------------
// import { auth } from "@/auth";
// import prisma from "@/backend/lib/prisma";
// import { getRolePermissions } from "@/backend/utils/getRolePermissions";
// import UsersClient from "./UsersClient";

// export default async function UsersPage() {
//   const session = await auth();

//   const permissions = await getRolePermissions({
//     prisma,
//     roleId: session.user.roleId,
//   });

//   return <UsersClient permissions={permissions} />;
// }

/// button examples-----------------------------------------------
// import { usePermission } from "@/hooks/usePermission";

// export default function UsersClient({ permissions }) {
//   const { can } = usePermission(permissions);

//   return (
//     <>
//       {can("user", "create") && (
//         <button className="btn-primary">Create User</button>
//       )}

//       {can("user", "update") && (
//         <button className="btn-warning">Edit</button>
//       )}

//       {!can("user", "delete") && (
//         <button disabled className="opacity-50 cursor-not-allowed">
//           Delete
//         </button>
//       )}
//     </>
//   );
// }
