const normalizeDeploymentUrl = (value) => {
  const candidate = String(value || "").trim().replace(/\/$/, "");
  if (!candidate) return "";

  try {
    const url = new URL(
      /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`,
    );
    if (!['http:', 'https:'].includes(url.protocol)) return "";
    return url.origin;
  } catch {
    return "";
  }
};

/**
 * Resolve the canonical origin without reading request headers. Hosting platforms
 * expose these values automatically while building, so pages using this helper
 * remain eligible for static generation and ISR.
 */
export function getSiteUrl() {
  const deploymentUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    process.env.CF_PAGES_URL ||
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL;

  return normalizeDeploymentUrl(deploymentUrl) || "http://localhost:3000";
}

export function absoluteSiteUrl(path = "/") {
  return new URL(path, `${getSiteUrl()}/`).toString();
}
