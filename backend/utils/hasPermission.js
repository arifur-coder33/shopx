"use server";

// export async function hasPermission({
//   prisma,
//   roleId,
//   resourceKey, // "user", "product", "order"
//   actionKey, // "create", "view", "update", "delete"
// }) {
//   if (!roleId || !resourceKey || !actionKey) {
//     return false;
//   }

//   const permission = await prisma.rolePermission.findFirst({
//     where: {
//       roleId,
//       allowed: true,
//       resource: {
//         key: resourceKey,
//       },
//       action: {
//         key: actionKey,
//       },
//     },
//     select: {
//       id: true,
//     },
//   });

//   return !!permission;
// }

///EXAMPLE USAGE-----------------------------------------------

// const canView = await hasPermission({
//   prisma,
//   roleId,
//   resourceKey: "product",
//   actionKey: "view",
// });

// if (!canView) {
//   redirect("/unauthorized");
// }

// lib/requirePermission.js
import { auth } from "@/auth";

export async function hasPermission(resource, action) {
  const session = await auth();

  // 🔐 not logged in
  if (!session?.user) {
    throw new Error("Unauthenticated");
  }

  const permissions = session.user.permissions ?? [];

  // 🛡 SUPER_ADMIN wildcard
  if (permissions.includes("*")) return true;

  const key = `${resource}:${action}`;

  if (!permissions.includes(key)) {
    throw new Error("Unauthorized");
  }

  // ✅ allowed → continue
  return true;
}

export async function getUserId() {
  const session = await auth();

  // 🔐 not logged in
  if (!session?.user) {
    return null;
  }
  return session.user.id;
}
