// file: app/layout.js
import { ThemeScript } from "@/components/common/ThemeScript";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";
import Providers from "@/components/common/Providers";
import {
  createSiteAppearanceCss,
  getPublicSiteAppearance,
  getPublicSiteIdentity,
} from "@/backend/services/siteAppearanceService";

// Import all font objects from your central font file
import { tiro_bangla } from "@/app/fonts/font";
import { getSiteUrl } from "@/lib/siteUrl";

export async function generateMetadata() {
  const identity = await getPublicSiteIdentity();
  const siteUrl = await getSiteUrl();
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: identity.seoTitle,
      template: `%s | ${identity.name}`,
    },
    description: identity.seoDescription,
    applicationName: identity.name,
    openGraph: {
      siteName: identity.name,
      type: "website",
      locale: "bn_BD",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    icons: {
      icon: [{ url: identity.faviconUrl }],
      shortcut: [{ url: identity.faviconUrl }],
      apple: [{ url: identity.faviconUrl }],
    },
  };
}

export default async function RootLayout({ children }) {
  const appearance = await getPublicSiteAppearance();
  return (
    // Apply all font variables to the <html> tag. This makes them globally available.
    <html
      lang="bn"
      className={tiro_bangla.variable}
      suppressHydrationWarning
    >
      <head>
        <link
          rel="preconnect"
          href="https://res.cloudinary.com"
          crossOrigin="anonymous"
        />

        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <ThemeScript />
        <style
          id="site-appearance"
          dangerouslySetInnerHTML={{
            __html: createSiteAppearanceCss(appearance),
          }}
        />
      </head>

      {/* 
        Apply a default font to the body. 'font-sans' will be mapped to Roboto in Tailwind.
        You no longer need to add font classNames directly to the body.
      */}
      <body className="font-sans antialiased theam">
        <NextTopLoader showSpinner={false} color={appearance.primaryColor} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
