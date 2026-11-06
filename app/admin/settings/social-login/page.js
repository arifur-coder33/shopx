import { getSocialAuthSettings } from "@/backend/serverActions/socialAuthAction";
import { getSiteUrl } from "@/lib/siteUrl";
import SocialLoginSettingsForm from "./SocialLoginSettingsForm";

export const dynamic = "force-dynamic";

export default async function SocialLoginSettingsPage() {
  const result = await getSocialAuthSettings();
  if (!result.success) {
    return <div className="card p-5 text-danger">{result.message}</div>;
  }
  return (
    <SocialLoginSettingsForm
      initialSettings={result.data}
      encryptionReady={result.encryptionReady}
      callbackUrls={{
        google: `${getSiteUrl()}/api/auth/callback/google`,
        facebook: `${getSiteUrl()}/api/auth/callback/facebook`,
      }}
    />
  );
}
