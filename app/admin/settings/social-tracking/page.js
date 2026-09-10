import { getSocialTrackingConfiguration } from "@/backend/serverActions/socialTrackingAction";
import SocialTrackingForm from "./SocialTrackingForm";

export const dynamic = "force-dynamic";

export default async function SocialTrackingPage() {
  const result = await getSocialTrackingConfiguration();
  if (!result.success) {
    return <div className="card p-5 text-danger">{result.message}</div>;
  }
  return <SocialTrackingForm initialSettings={result.data} />;
}

