import { unstable_cache } from "next/cache";
import { getServerSocialTrackingSettings } from "@/backend/services/socialTrackingService";

// Clarity allows at most 10 export requests per project per day. Cache the
// aggregate report for six hours so admin refreshes do not exhaust that quota.
const readClarityInsights = unstable_cache(
  async (apiToken) => {
    const url = new URL(
      "https://www.clarity.ms/export-data/api/v1/project-live-insights",
    );
    url.searchParams.set("numOfDays", "3");
    url.searchParams.set("dimension1", "URL");

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 6 * 60 * 60 },
    });
    if (response.status === 401 || response.status === 403) {
      throw new Error("Clarity rejected the API token. Check the Data Export token in Traffic settings.");
    }
    if (response.status === 429) {
      throw new Error("Clarity export API daily limit reached. The cached report will be available later.");
    }
    if (!response.ok) {
      throw new Error(`Clarity insights could not be loaded (HTTP ${response.status}).`);
    }
    const report = await response.json();
    return Array.isArray(report) ? report : [];
  },
  ["clarity-live-insights-v1"],
  { revalidate: 6 * 60 * 60 },
);

export async function loadClarityInsights() {
  const settings = await getServerSocialTrackingSettings();
  if (!settings.clarityProjectId) {
    throw new Error("Add the Clarity Project ID under Traffic → Tracking Settings.");
  }
  if (!settings.clarityApiToken) {
    throw new Error("Add a Clarity Data Export API token under Traffic → Tracking Settings.");
  }
  return readClarityInsights(settings.clarityApiToken);
}
