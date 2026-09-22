import { requirePlatformPage } from "@/backend/services/platformConsole.server";
import { getDeploymentMode } from "@/backend/services/deploymentModeService";
import { Panel } from "../../_components/PlatformUI";

export const metadata = { title: "Platform settings" };

export default async function PlatformSettingsPage() {
  await requirePlatformPage();
  return <><div><p className="text-sm font-semibold text-indigo-700">Configuration</p><h1 className="text-3xl font-bold">Platform settings</h1><p className="mt-1 text-sm text-slate-600">Current runtime configuration. Secrets are never shown here.</p></div>
    <Panel title="Environment"><dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">Deployment mode</dt><dd className="font-semibold">{getDeploymentMode()}</dd></div><div><dt className="text-slate-500">Platform domain</dt><dd className="font-semibold">{process.env.PLATFORM_DOMAIN || "Not configured"}</dd></div></dl></Panel>
    <Panel title="Coming later"><p className="text-sm text-slate-600">Billing gateway integration, domain verification, and advanced Platform settings will be added in their own phases. No persisted Platform settings model exists yet.</p></Panel>
  </>;
}
