// The layout from your first question (e.g., app/(user)/layout.js)
import ThirdPartyScripts from "@/components/common/ThirdPartyScripts";
import Footer from "@/components/footer/Footer";
import NavBar from "@/components/NavBar"; // The optimized NavBar from our previous discussion
import { getPublicSocialTrackingSettings } from "@/backend/services/socialTrackingService";
import RouteViewTracker from "@/components/common/RouteViewTracker";

export const revalidate = 60;

export default async function UserLayout({ children }) {
  const trackingSettings = await getPublicSocialTrackingSettings();

  return (
    <>
      <NavBar />
      <main className="site-container min-h-screen pb-20 pt-2 md:pb-4 md:pt-4">{children}</main>
      <Footer />

      {/* All your scripts are now cleanly handled by this component */}
      <ThirdPartyScripts settings={trackingSettings} />
      <RouteViewTracker />

      {/* The noscript tag is for users without JavaScript. It MUST remain here */}
      {/* in the HTML body and cannot be inside the client component. */}
      {trackingSettings.facebookPixelId && (
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src={`https://www.facebook.com/tr?id=${trackingSettings.facebookPixelId}&ev=PageView&noscript=1`}
            alt="Facebook Pixel"
          />
        </noscript>
      )}
    </>
  );
}
