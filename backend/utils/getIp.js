export function getIP(h) {
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();

  const realIP = h.get("x-real-ip");
  if (realIP) return realIP;

  return "unknown";
}
