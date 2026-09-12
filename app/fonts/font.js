import localFont from "next/font/local";

// Bundled fonts keep production builds independent from Google Fonts.
export const tiro_bangla = localFont({
  src: "../../public/fonts/SolaimanLipi.ttf",
  display: "swap",
  preload: false,
  variable: "--font-tiro-bangla",
});

export const kalpanaUnicode = localFont({
  src: "./KalpanaUNICODE.ttf",
  display: "swap",
  preload: false,
  variable: "--font-kalpana",
});
