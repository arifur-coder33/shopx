export function hasAccess(session, resource, action) {
  if (!session) return false;

  if (session.user.role === "SUPER_ADMIN") return true;

  return session.user.permissions?.includes(`${resource}:${action}`);
}
