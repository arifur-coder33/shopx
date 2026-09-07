// file: app/layout.js
import { ThemeScript } from "@/components/common/ThemeScript";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";
import Providers from "@/components/common/Providers";

// Import all font objects from your central font file
import { kalpanaUnicode, tiro_bangla } from "@/app/fonts/font";

export const metadata = {
  // ... your existing metadata object
};

export default function RootLayout({ children }) {
  return (
    // Apply all font variables to the <html> tag. This makes them globally available.
    <html
      lang="bn"
      className={`${tiro_bangla.variable} ${kalpanaUnicode.variable}`}
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
      </head>

      {/* 
        Apply a default font to the body. 'font-sans' will be mapped to Roboto in Tailwind.
        You no longer need to add font classNames directly to the body.
      */}
      <body className="font-sans antialiased theam">
        <NextTopLoader showSpinner={false} color="#8A2BE2" />

        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
