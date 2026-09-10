import { headers } from "next/headers";

const safeHost = (value) => {
  const host = String(value || "").split(",")[0].trim().toLowerCase();
  return /^[a-z0-9.-]+(?::\d+)?$/i.test(host) ? host : "";
};

export async function getSiteUrl() {
  let requestHeaders;
  try {
    requestHeaders = await headers();
  } catch {
    return "http://localhost:3000";
  }
  const host = safeHost(
    requestHeaders.get("x-forwarded-host") || requestHeaders.get("host"),
  );
  if (!host) return "http://localhost:3000";

  const forwardedProtocol = String(
    requestHeaders.get("x-forwarded-proto") || "",
  ).split(",")[0].trim().toLowerCase();
  const protocol = ["http", "https"].includes(forwardedProtocol)
    ? forwardedProtocol
    : host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https";
  return `${protocol}://${host}`;
}

export async function absoluteSiteUrl(path = "/") {
  return new URL(path, `${await getSiteUrl()}/`).toString();
}
