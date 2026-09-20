const DOMAIN_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function normalizeHostname(value) {
  const input = String(value || "").trim().toLowerCase();
  if (!input) return null;

  let hostname;
  try {
    const parsed = new URL(
      input.includes("://") ? input : `http://${input}`,
    );
    hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return null;
  }

  if (hostname.startsWith("www.")) hostname = hostname.slice(4);
  if (!hostname || hostname.length > 253) return null;
  if (hostname === "localhost") return hostname;

  const labels = hostname.split(".");
  if (labels.length < 2 || labels.some((label) => !DOMAIN_LABEL.test(label))) {
    return null;
  }

  return hostname;
}
