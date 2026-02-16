// lib/can.js
export function can(permissions, resource, action) {
  if (!permissions) return false;

  // SUPER_ADMIN
  if (permissions.includes("*")) return true;

  return permissions.includes(`${resource}:${action}`);
}
