const DEPLOYMENT_MODES = new Set(["SAAS", "STANDALONE"]);

export function getDeploymentMode() {
  const mode = String(process.env.DEPLOYMENT_MODE || "")
    .trim()
    .toUpperCase();

  if (!DEPLOYMENT_MODES.has(mode)) {
    throw new Error(
      "DEPLOYMENT_MODE must be configured as SAAS or STANDALONE.",
    );
  }

  return mode;
}
