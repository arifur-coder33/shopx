// file: app/fonts/font.js

import { Roboto, Tiro_Bangla } from "next/font/google";
import localFont from "next/font/local"; // <-- IMPORT THIS

// Your existing Google Font definitions are great.
// We'll add CSS variables for better integration with Tailwind.
export const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-roboto",
});

export const tiro_bangla = Tiro_Bangla({
  subsets: ["bengali"],
  display: "swap",
  weight: "400",
  variable: "--font-tiro-bangla",
});

// --- THIS IS THE NEW PART FOR YOUR LOCAL FONT ---
// It replaces the need for a custom <KalpanaUNICODE> component.
export const kalpanaUnicode = localFont({
  // IMPORTANT: This path must be relative to this file.
  // Make sure your Kalpana.woff2 (or .ttf, .otf) file is inside the app/fonts/ directory.
  src: "./KalpanaUNICODE.ttf",
  display: "swap",
  variable: "--font-kalpana", // We'll use this variable in Tailwind
});
