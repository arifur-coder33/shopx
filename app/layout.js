// file: app/layout.js
import Script from "next/script";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";
import Providers from "@/components/common/Providers";
import {
  createSiteAppearanceCss,
  getPublicSiteAppearance,
  getPublicSiteIdentity,
} from "@/backend/services/siteAppearanceService";



import { getSiteUrl } from "@/lib/siteUrl";

export async function generateMetadata() {
  const identity = await getPublicSiteIdentity();
  const siteUrl = await getSiteUrl();
  const keywords = identity.seoKeywords
    .split(/[\n,]/)
    .map((keyword) => keyword.trim())
    .filter(Boolean);
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: identity.seoTitle,
      template: `%s | ${identity.name}`,
    },
    description: identity.seoDescription,
    ...(keywords.length > 0 && { keywords }),
    ...(identity.googleSiteVerification && {
      verification: { google: identity.googleSiteVerification },
    }),
    ...(identity.facebookDomainVerification && {
      other: { "facebook-domain-verification": identity.facebookDomainVerification },
    }),
    applicationName: identity.name,
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, title: identity.name, statusBarStyle: "default" },
    alternates: { canonical: siteUrl },
    openGraph: {
      siteName: identity.name,
      type: "website",
      locale: "bn_BD",
    },
    twitter: {
      card: "summary_large_image",
      title: identity.seoTitle,
      description: identity.seoDescription,
      ...(identity.logoUrl && { images: [identity.logoUrl] }),
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

    <html
      lang="bn"

      suppressHydrationWarning
    >
      <head>
        <link
          rel="preconnect"
          href="https://res.cloudinary.com"
        />

        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <Script
          id="initialize-saved-theme"
          src="/theme-init.js"
          strategy="beforeInteractive"
        />
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
