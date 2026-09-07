// The layout from your first question (e.g., app/(user)/layout.js)
import ThirdPartyScripts from "@/components/common/ThirdPartyScripts";
import Footer from "@/components/footer/Footer";
import NavBar from "@/components/NavBar"; // The optimized NavBar from our previous discussion

export const revalidate = 60;

// The metadata from this layout will be merged with the RootLayout's metadata
export const metadata = {
  title: " আমার শপ",
  description: "ঘরে বসে পন্য অর্ডার করুন",
  // No need to preconnect again, but it doesn't hurt
};

export default async function UserLayout({ children }) {
  const pixelId = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;

  return (
    <>
      <NavBar />
      <main className="site-container min-h-screen pb-20 pt-2 md:pb-4 md:pt-4">{children}</main>
      <Footer />

      {/* All your scripts are now cleanly handled by this component */}
      <ThirdPartyScripts />

      {/* The noscript tag is for users without JavaScript. It MUST remain here */}
      {/* in the HTML body and cannot be inside the client component. */}
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt="Facebook Pixel"
        />
      </noscript>
    </>
  );
}
